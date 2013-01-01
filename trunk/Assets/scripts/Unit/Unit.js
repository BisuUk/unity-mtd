#pragma strict
#pragma downcast

var unitType : int;
var typeName : String;
var slopeMult : float;
var scaleLimits  : Vector2;
var healthLimits : Vector2;
var character : GameObject;
var bottomAttach : Transform;
var selectPrefab : Transform;
var explosionPrefab : Transform;
var splatterPrefab : Transform;
var floatingTextPrefab : Transform;
var mitigationFXPrefab : Transform;
var AOE : Transform;
var trail : TrailRenderer;
var netView : NetworkView;

@HideInInspector var ID : int;
@HideInInspector var strength : float;
@HideInInspector var color : Color;
@HideInInspector var size  : float;
@HideInInspector var squadID : int;
@HideInInspector var actualSize : float;
@HideInInspector var actualColor : Color;
@HideInInspector var actualSpeed : float;
@HideInInspector var speed : float;
@HideInInspector var health : int;
@HideInInspector var maxHealth : int;
@HideInInspector var isAttackable : boolean;
@HideInInspector var nextWaypoint : int;
@HideInInspector var isWalking : boolean;
@HideInInspector var isLeaping : boolean;
@HideInInspector var isSelected : boolean;
@HideInInspector var emitter : Emitter;
@HideInInspector var usedAbility1 : boolean;
@HideInInspector var velocity : Vector3;

private var path : List.<Vector3>;
private var pointCaptureCount : int;
private var prefabScale : Vector3;
private var minScale : Vector3;
private var nextColorRecoveryTime : float;
private var pathCaptureDist : float = 0.5;
private var buffs : Dictionary.< int, List.<Effect> >;
private var debuffs : Dictionary.< int, List.<Effect> >;
private var lastHeight : float;
private var slopeSpeedMult : float;
private var hudHealthBar : UISlider;
private var isHovered : boolean;
private var leapsToDo : List.<LeapInfo>;

static private var colorRecoveryInterval : float = 0.275;

//-----------
// UNIT
//-----------
function Awake()
{
   isWalking = false;
   isAttackable = true;
   prefabScale = transform.localScale;
   minScale = prefabScale;
   usedAbility1 = false;
   buffs = new Dictionary.< int, List.<Effect> >();
   debuffs = new Dictionary.< int, List.<Effect> >();
   nextColorRecoveryTime = 0.0;
   selectPrefab.gameObject.SetActive(false);
   leapsToDo = new List.<LeapInfo>();
   isLeaping = false;

   if (!Network.isClient)
      Game.control.OnUnitSpawn();
}

function FixedUpdate()
{
   if (isWalking)
   {
      // Reset actuals, buffs/debuffs will recalculate
      actualSpeed = speed;
      // NOTE: "1.0*" is float cast
      //var healthScaleModifier : float = ((1.0*health/maxHealth)<0.5) ? 0.5 : (1.0*health/maxHealth);
      //actualSize = (Mathf.Lerp(scaleLimits.x, scaleLimits.y, size)) * healthScaleModifier;
   
      // Update any (de)buff effects
      UpdateBuffs();
      UpdateDebuffs();
   
      // Set actuals, diff conditionals are inside functions
      SetActualColor(actualColor.r, actualColor.g, actualColor.b);
      SetActualSpeed(actualSpeed);
      //SetActualSize(actualSize);

      // Check path, clients may not have it yet (until ClientSetAttributes is called)
      if (path && path.Count>0)
         DoWalking();
   }
   else
   {
      if (!isLeaping && leapsToDo.Count > 0)
      {
         isLeaping = true;
         DoLeaps();
      }
   }

   if (hudHealthBar)
      hudHealthBar.sliderValue = 1.0*health/maxHealth;

/* // NOTE: DECIDED THIS WAS UNBALANCING THE GAME
   // Fade color back on client and server
   if (actualColor != color)
   {
      // Slowly recovery actualcolor to original color
      if (Utility.ColorMatch(actualColor, color) >= 0.95)
      {
         actualColor = color; // close enough, stop interpolating
      }
      else if (Time.time >= nextColorRecoveryTime)
      {
         // Slowly interpolate from actual to original
         actualColor = Color.Lerp(actualColor, color, 0.1);
         // Set next color jump time
      }
      SetChildrenColor(transform, actualColor);
   }
*/
}

function SetHudVisible(visible : boolean)
{
   if (hudHealthBar)
      hudHealthBar.gameObject.SetActive(isSelected || visible);
}

function SetSelected(selected : boolean)
{
   isSelected = selected;
   SendMessage("OnSetSelected", selected, SendMessageOptions.DontRequireReceiver);

   SetHudVisible(isSelected);

   selectPrefab.gameObject.SetActive(isSelected);
   var tween : TweenScale = selectPrefab.GetComponent(TweenScale);
   if (tween && isSelected)
   {
      tween.Reset();
      tween.Play(true);
   }
}

function SetChildrenHovered(t : Transform, hovered : boolean)
{
   if (t.renderer && t != AOE && t != selectPrefab)
   {
      t.renderer.material.SetColor("_OutlineColor", (hovered) ? Color.green : Color.black);
      t.renderer.material.SetFloat("_Outline", (hovered) ? 0.007 : 0.001);
   }

   for (var child : Transform in t)
      SetChildrenHovered(child, hovered);
}

function SetHovered(hovered : boolean)
{
   isHovered = hovered;
   SetChildrenHovered(transform, isHovered);
}

function OnMouseDown()
{
   UIControl.CurrentUI().SendMessage("OnPressUnit", this, SendMessageOptions.DontRequireReceiver);
}

function OnMouseEnter()
{
   UIControl.CurrentUI().SendMessage("OnMouseEnterUnit", this, SendMessageOptions.DontRequireReceiver);
}

function OnMouseExit()
{
   UIControl.CurrentUI().SendMessage("OnMouseExitUnit", this, SendMessageOptions.DontRequireReceiver);
}

function GetToolTipString() : String
{
   var returnString = "";
   if (strength == 0.0)
      returnString = "[00FF00]Light";
   else if (strength == 0.5)
      returnString = "[FFFF00]Medium";
   else
      returnString = "[FF0000]Heavy";

   returnString += ("[FFFFFF] " + typeName);
   returnString += (" Unit");
   return returnString;
}

@RPC
function SetPosition(pos : Vector3)
{
   transform.position = pos;
   if (Network.isServer)
      netView.RPC("SetPosition", RPCMode.Others, pos);
}

@RPC
function SetWalking(walking : boolean)
{
   //if (walking && isLeaping)
   //   return;

   isWalking = walking;
   if (character)
   {
      if (isWalking)
         character.animation.Play("walk");
      else
         character.animation.Stop();
   }

   if (Network.isServer)
      netView.RPC("SetWalking", RPCMode.Others, walking);
}

function DoWalking()
{
   var waypoint : Vector3;
   var wayGroundPos : Vector3;
   var newPos : Vector3;
   var groundPos : Vector3;
   var forwardVec : Vector3;
   var distToWay : float;
   var rcHit : RaycastHit;
   var mask : int = 1 << 10; // terrain

   // Check if we're at the end of our current path
   if (nextWaypoint > (path.Count-1))
   {
      //Kill();
      return;
   }

   // Move toward next waypoint
   // get next way
   waypoint = path[nextWaypoint];
   //transform.LookAt(waypoint);
   //transform.Translate(transform.forward * actualSpeed * Time.deltaTime, Space.World);
   wayGroundPos = waypoint;
   wayGroundPos.y = 0.0;
   groundPos = transform.position;
   groundPos.y = 0.0;
   forwardVec = wayGroundPos - groundPos;
   distToWay = forwardVec.magnitude;
   forwardVec = forwardVec.normalized;

   // Calculate slope speed multiplier
   if (transform.localEulerAngles.x == 0.0) // unit is on flat ground
      slopeSpeedMult = 1.0;
   else if (transform.localEulerAngles.x >= 270.0) // unit going uphill (-speed)
      slopeSpeedMult = (transform.localEulerAngles.x/360.0)/slopeMult;
   else if (transform.localEulerAngles.x <= 90) // unit going downhill (+speed)
      slopeSpeedMult = (1.0 + transform.localEulerAngles.x/90.0) * slopeMult;

   // Calculate our new position from this speed
   actualSpeed = actualSpeed * slopeSpeedMult;
   var actualForwardVector : Vector3 = (forwardVec * actualSpeed * Time.deltaTime);
   velocity = actualForwardVector;


   newPos = transform.position + actualForwardVector;
   newPos.y += 25000;

   // Align this new position with the terrain
   if (Physics.Raycast(newPos, Vector3.down, rcHit, Mathf.Infinity, mask))
   {
      // Avoids spamming a zero vector on rotation warning.
      if (forwardVec.magnitude > 0)
         transform.rotation = Quaternion.FromToRotation(Vector3.up, rcHit.normal) * Quaternion.LookRotation(forwardVec);
      transform.position = rcHit.point + (Vector3.up*0.5);
   }

   //Debug.Log("distToWay="+distToWay+" afv="+actualForwardVector.magnitude+" wp="+nextWaypoint+" p="+transform.position);

   // If we've captured a waypoint, pop queue for next waypoint
   if (distToWay <= (actualForwardVector.magnitude))
   {
      pointCaptureCount += 1;
      nextWaypoint += 1;
   }

   // Sets animation play speed based on actual speed
   UpdateWalkAnimationSpeed();
}

private function DoLeaps()
{
   if (leapsToDo.Count > 0)
   {
      var leapScr : BallisticProjectile = transform.GetComponent(BallisticProjectile);
      leapScr.arcHeight = leapsToDo[0].arcHeight;
      leapScr.timeToImpact = leapsToDo[0].timeToImpact;
      leapScr.completeTarget = transform;
      leapScr.FireAt(leapsToDo[0].pos);
   }
}

function LeapTo(pos : Vector3, arcHeight : float, timeToImpact : float, killOnImpact : boolean)
{
   var leap : LeapInfo = new LeapInfo();
   leap.pos = pos;
   leap.timeToImpact = timeToImpact;
   leap.arcHeight = arcHeight;
   leap.killOnImpact = killOnImpact;
   leap.splatColor = killOnImpact;
   leapsToDo.Add(leap);
   SetWalking(false);
}

function LeapTo(pos : Vector3)
{
   LeapTo(pos, 20, 0.5, false);
}

function OnProjectileImpact()
{
   if (leapsToDo[0].killOnImpact)
      Kill();
   else if (leapsToDo[0].splatColor)
      Splat(leapsToDo[0].splatColor);

   leapsToDo.RemoveAt(0);

   if (leapsToDo.Count > 0)
   {
      var leapScr : BallisticProjectile = transform.GetComponent(BallisticProjectile);
      leapScr.arcHeight = leapsToDo[0].arcHeight;
      leapScr.timeToImpact = leapsToDo[0].timeToImpact;
      leapScr.completeTarget = transform;
      leapScr.FireAt(leapsToDo[0].pos);
   }
   else
   {
      isLeaping = false;
      //SetWalking(true);
   }
}

function UpdateBuffs()
{
   var newIsAttackable : boolean = true;
   var newShowTrail : boolean = false;

   for (var owner : int in buffs.Keys)
   {
      var buffList : List.<Effect> = buffs[owner];
      var buff : Effect;

      for (buff in buffList)
      {
         // If constant debuff, apply every frame
         if (buff.interval == 0.0)
         {
            switch (buff.type)
            {
               case ActionType.ACTION_SPEED_CHANGE:
                  //actualSpeed += (actualSpeed*(Utility.ColorMatch(actualColor, buff.color) * buff.val));
                  actualSpeed += (speed*(Utility.ColorMatch(actualColor, buff.color) * buff.val));
                  newShowTrail = true;
                  //Debug.Log("actual="+actualSpeed+" buff.val="+buff.val);
               break;
               case ActionType.ACTION_SHIELD:
                  newIsAttackable = false;
               break;
            }
         }
         // If on interval, check if it is time to apply
         else if (Time.time >= buff.nextFireTime)
         {
            switch (buff.type)
            {
               case ActionType.ACTION_HEAL:
               // HoT can tick here...
               break;
               case ActionType.ACTION_COLOR_CHANGE:
                  //actualColor = Color.Lerp(actualColor, buff.color, (buff.val*0.33));
                  actualColor = buff.color;
               break;
            }
            buff.nextFireTime = Time.time + buff.interval;
         }
      }

      // Remove all expired effects
      for (var index : int = buffList.Count-1; index >= 0; index--)
      {
         buff = buffList[index];
         // Remove if expired (0.0 == no expiration)
         if (buff.expireTime > 0.0 && Time.time >= buff.expireTime)
            buffList.RemoveAt(index);
      }
   }

   SetAttackable(isWalking && newIsAttackable);
}

function UpdateDebuffs()
{
   for (var owner : int in debuffs.Keys)
   {
      var debuffList : List.<Effect> = debuffs[owner];
      var debuff : Effect;
      for (debuff in debuffList)
      {
         // If constant debuff, apply every frame
         if (debuff.interval == 0.0)
         {
            switch (debuff.type)
            {
               // Slow effect
               case ActionType.ACTION_SPEED_CHANGE:
                  actualSpeed *= (1.0-(Utility.ColorMatch(actualColor, debuff.color) * debuff.val));
                  // Check for color & minimum speed cap
                  //if (actualSpeed < 0.33)
                  //   actualSpeed = 0.33;
                  //Debug.Log("actual="+actualSpeed+" debuff.val="+debuff.val);
               break;
            }
         }
         // If on interval, check if it is time to apply
         else if (Time.time >= debuff.nextFireTime)
         {
            switch (debuff.type)
            {
               case ActionType.ACTION_COLOR_CHANGE:
                  //actualColor = Color.Lerp(actualColor, debuff.color, (debuff.val*0.33));
                  actualColor = debuff.color;
               break;
            }
            debuff.nextFireTime = Time.time + debuff.interval;
         }
      }

      // Remove all expired effects
      for (var index : int = debuffList.Count-1; index >= 0; index--)
      {

         debuff = debuffList[index];
         // Remove if expired (0.0 == no expiration)
         if (debuff.expireTime > 0.0 && Time.time >= debuff.expireTime)
            debuffList.RemoveAt(index);
      }
   }
}

function SetPath(followPath : List.<Vector3>)
{
   path = new List.<Vector3>(followPath);

   if (path.Count > 0)
   {
      transform.LookAt(path[0]);
      nextWaypoint = 0;
   }
}

function ReversePath()
{
   var newNextWaypoint = path.Count - nextWaypoint;
   path.Reverse();
   nextWaypoint = newNextWaypoint;
   if (path.Count > 0)
      transform.LookAt(path[0]);
}

@RPC
function ClientGetPathFromRedirector(redirectorNetID : NetworkViewID, state : int)
{
   // May need to speed this up
   var rds : GameObject[] = GameObject.FindGameObjectsWithTag("REDIRECT");
   for (var rdo : GameObject in rds)
   {
      var rd : Redirector = rdo.GetComponent(Redirector);
      if (rd.netView.viewID == redirectorNetID)
      {
         //Debug.Log("FOUND RD s="+state+" rds="+rd.currentState);
         rd.Redirect(this);
      }
   }
}

function SetAttributes(ua : UnitAttributes)
{
   SetAttributes(ua.unitType, ua.size, ua.speed, ua.strength, ua.color);
}

function SetAttributes(pUnitType : int, pSize : float, pSpeed : float, pStrength : float, pColor : Color)
{
   unitType = pUnitType;
   size = pSize;
   speed = pSpeed;
   actualSpeed = pSpeed;
   strength = pStrength;
   color = pColor;

   actualColor = pColor;

   SendMessage("SetColor", pColor, SendMessageOptions.DontRequireReceiver);
   //SetColor(pColor);
   //maxHealth = 100 + (pSize * 400);

   maxHealth = Mathf.Lerp(healthLimits.x, healthLimits.y, size);
   health = maxHealth;

   actualSize = Mathf.Lerp(scaleLimits.x, scaleLimits.y, size);
   transform.localScale = Vector3.one * actualSize;

   gameObject.SendMessage("AttributesChanged", SendMessageOptions.DontRequireReceiver);
}

@RPC
function ClientSetAttributes(pUnitType : int, pSize : float, pSpeed : float, pStrength : float, r : float, g : float, b : float, emitterNetID : NetworkViewID)
{
   SetAttributes(pUnitType, pSize, pSpeed, pStrength, Color(r,g,b));

   var objs : GameObject[] = GameObject.FindGameObjectsWithTag("EMITTER");
   for (var obj : GameObject in objs)
   {
      if (obj.networkView.viewID == emitterNetID)
      {
         obj.SendMessage("PostLaunch", this, SendMessageOptions.DontRequireReceiver);
         break;
      }
   }
}

function SetColor(newColor : Color)
{
   color = newColor;
   SetChildrenColor(transform, color);
}

private function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t == AOE)
      return;

   if (t.renderer)
   {
      t.renderer.material.color = newColor;
      t.renderer.material.SetColor("_TintColor", newColor);
      t.renderer.material.SetColor("_MainColor", newColor);
   }
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}

function SetColor(newColor : Color, colorName : String)
{
   color = newColor;
   SetChildrenColor(transform, color, colorName);
}

private function SetChildrenColor(t : Transform, newColor : Color, colorName : String)
{
   if (t == AOE || !t.renderer)
      return;
   t.renderer.material.SetColor(colorName, newColor);
   for (var child : Transform in t)
      SetChildrenColor(child, newColor, colorName);
}

function SetMaterial(newMaterial : Material)
{
   SetChildrenMaterial(transform, newMaterial);
}

private function SetChildrenMaterial(t : Transform, newMaterial : Material)
{
   if (t == AOE || !t.renderer)
      return;
   t.renderer.material = newMaterial;
   for (var child : Transform in t)
      SetChildrenMaterial(child, newMaterial);
}

function SetVisible(visible : boolean)
{
   SetChildrenVisible(transform, visible);
}

private function SetChildrenVisible(t : Transform, visible : boolean)
{
   if (!t.renderer)
      return;
   t.renderer.enabled = visible;
   for (var child : Transform in t)
      SetChildrenVisible(child, visible);
}

function UpdateWalkAnimationSpeed()
{
   if (character && character.animation)
   {
      // Make all animations in this character play at half speed
      for (var state : AnimationState in character.animation)
         state.speed = Mathf.Lerp(1.5, 0.5, strength) * (actualSpeed/speed);
   }
}

@RPC
function FloatingText(str : String, colorRed : float, colorGreen : float, colorBlue : float)
{
   // Spawn local text prefab
   var textItem : Transform = Instantiate(floatingTextPrefab, transform.position, Quaternion.identity);

   // Set text color - Attack = unit color / Defend = tower color
   var textColor : Color = Color(colorRed, colorGreen, colorBlue);
   if (Game.player.isAttacker)
     textColor = actualColor;

   // Attach the bahavior script
   var rfx : RiseAndFadeFX = textItem.gameObject.AddComponent(RiseAndFadeFX);
   rfx.lifeTime = 0.75;
   rfx.startColor = textColor;
   rfx.endColor = textColor;
   rfx.endColor.a = 0.35;
   rfx.riseRate = 2.0;
   // Set text value
   var tm : TextMesh = textItem.GetComponent(TextMesh);
   tm.text = str;
   tm.fontSize = 30;
   // Set start position
   textItem.transform.position = transform.position + (Camera.main.transform.up*1.0) + (Camera.main.transform.right*0.5);
}

@RPC
function MitigationFX(colorRed : float, colorGreen : float, colorBlue : float)
{
   // If we did heal someone for some value, show particle effect
   var shotFX : Transform = Instantiate(mitigationFXPrefab, transform.position, Quaternion.identity);
   var shotFXParticle : ParticleSystem = shotFX.GetComponent(ParticleSystem);
   shotFXParticle.startColor = Color(colorRed, colorGreen, colorBlue);
}

function ApplyBuff(applierID : int, effect : Effect, applierCanRefresh : boolean)
{
   if (effect.interval > 0.0)
      effect.nextFireTime = Time.time;
   if (buffs.ContainsKey(applierID))
   {
      var buffList : List.<Effect> = buffs[applierID];
      for (var buff : Effect in buffList)
      {
         // Replace existing effect
         if (buff.type == effect.type)
         {
            if (applierCanRefresh)
               buff.Copy(effect);
            return;
         }
      }
   }
   else
      buffs.Add(applierID, new List.<Effect>());

   // Add to applier's list
   buffs[applierID].Add(effect);
}

function RemoveBuff(applierID : int, type : int)
{
   if (buffs.ContainsKey(applierID))
   {
      var buffList : List.<Effect> = buffs[applierID];
      for (var index : int = buffList.Count-1; index >= 0; index--)
      {
         // Remove buff
         if (buffList[index].type == type)
         {
            buffList.RemoveAt(index);
            return;
         }
      }
   }
}

function ApplyDebuff(applierID : int, effect : Effect, applierCanRefresh : boolean)
{
   if (effect.interval > 0.0)
      effect.nextFireTime = Time.time;
   if (debuffs.ContainsKey(applierID))
   {
      var debuffList : List.<Effect> = debuffs[applierID];
      for (var debuff : Effect in debuffList)
      {
         // Replace existing effect
         if (debuff.type == effect.type)
         {
            if (applierCanRefresh)
               debuff.Copy(effect);
            return;
         }
      }
   }
   else   // Add new applied ID to unit's list of appliers
      debuffs.Add(applierID, new List.<Effect>());

   // Add to applier's list
   debuffs[applierID].Add(effect);
}

function RemoveDebuff(applierID : int, type : int)
{
   if (debuffs.ContainsKey(applierID))
   {
      var debuffList : List.<Effect> = debuffs[applierID];
      for (var index : int = debuffList.Count-1; index >= 0; index--)
      {
         // Remove buff
         if (debuffList[index].type == type)
         {
            debuffList.RemoveAt(index);
            return;
         }
      }
   }
}

function ApplyHealing(applierID : int, amount : int, healColor : Color) : boolean
{
   var newAmount : int = Utility.ColorMatch(actualColor, healColor) * amount;

   // Already at full health
   if (health >= maxHealth)
      return false;

   // Apply value
   health += newAmount;

   // Cap at max health, only display amount of healing
   if (health > maxHealth)
   {
      newAmount = health-maxHealth;
      health = maxHealth;
   }

   if (amount > 0)
   {
      // Tell everyone to spawn floating damage text
      var str : String = "+"+newAmount.ToString();
      FloatingText(str, healColor.r, healColor.g, healColor.b);
      if (Game.hostType > 0)
         netView.RPC("FloatingText", RPCMode.Others, str, healColor.r, healColor.g, healColor.b);
   }

   return true;
}

function ApplyDamage(applierID : int, amount : int, damageColor : Color)
{
   // Calculate any damage reduction
   var newAmount : int = MitigateDamage(amount, damageColor);

   // Show mitigation effect on client and server
   if (newAmount < amount)
   {
      MitigationFX(damageColor.r, damageColor.g, damageColor.b);
      if (Game.hostType > 0)
         netView.RPC("MitigationFX", RPCMode.Others, damageColor.r, damageColor.g, damageColor.b);
   }

   // Match damage to color
   newAmount = Utility.ColorMatch(actualColor, damageColor) * newAmount;

   // Apply value
   health -= newAmount;

   // Tell everyone to spawn floating damage text
   var str : String = newAmount.ToString();
   FloatingText(str, damageColor.r, damageColor.g, damageColor.b);
   if (Game.hostType > 0)
      netView.RPC("FloatingText", RPCMode.Others, str, damageColor.r, damageColor.g, damageColor.b);

   // If this unit was killed, tell everyone to splode, and remove from network
   if (health <= 0)
      Kill();
}

function MitigateDamage(amount : int, damageColor : Color) : int
{
   var newAmount : float = parseFloat(amount);

   for (var owner : int in buffs.Keys)
   {
      var buffList : List.<Effect> = buffs[owner];
      var buff : Effect;

      for (buff in buffList)
      {
         switch (buff.type)
         {
            case ActionType.ACTION_SHIELD:
               newAmount -= (newAmount * ((1.0-Utility.ColorMatch(damageColor, buff.color)) * buff.val));
               //Debug.Log("MitigateDamage="+amount+" >> "+newAmount);
            break;
         }
      }
   }
   //Debug.Log("MitigateDamage="+amount+">>"+newAmount);
   return Mathf.CeilToInt(newAmount);
}

function KillIn(timeInSeconds : float)
{
   Invoke("Kill", timeInSeconds);
}

function Kill()
{
   Explode();
   if (Network.isServer)
      netView.RPC("Explode", RPCMode.Others);

   Game.control.OnUnitDeath();

   // Move unit away and wait for fixedupdate, this will cause
   // any triggers this unit died within to fire OnTriggerExit.
   transform.Translate(Vector3.down * 10000);
   yield WaitForFixedUpdate();

   Remove();
}

function RemoveIn(timeInSeconds : float)
{
   Invoke("Remove", timeInSeconds);
}

function Remove()
{
   // Remove unit from world
   if (Network.isServer)
   {
      Network.RemoveRPCs(netView.viewID);
      Network.Destroy(gameObject);
   }
   else
   {
      Destroy(gameObject);
   }

   Game.control.OnUnitRemove();
}

function Splat()
{
   Splat(true);
}

function Splat(effectOtherUnits : boolean)
{
   // Spawn splat with a little offset
   var randRange : float = 10.0;
   var rand : Vector3 = (Vector3(Random.Range(-randRange, randRange), 0, Random.Range(-randRange, randRange)));
   var randRot : Quaternion;
   randRot.eulerAngles = Vector3(0, Random.Range(0, 360), 0);

   var splat : Transform = Instantiate(splatterPrefab, transform.position, randRot);
   // Set color to be alpha'd out
   var c : Color = actualColor;
   c.a = 0;
   // Copy material, projectors use 'shared' materials
   var projector : Projector = splat.FindChild("Projector").GetComponent(Projector);
   var newMat : Material = new Material(projector.material);
   newMat.SetColor("_TintColor", c);
   projector.material = newMat;

   // Color units within radius
   if (effectOtherUnits)
   {
      var objs: GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
      for (var go : GameObject in objs)
      {
         if ((go.transform.position - transform.position).magnitude <= 30)
         {
            var unit : Unit = go.GetComponent(Unit);
            if (unit)
            {
               var mixColor : Color = Utility.GetMixColor(actualColor, unit.actualColor);
               unit.SetActualColor(mixColor.r, mixColor.g, mixColor.b);
            }
         }
      }
   }
}

@RPC
function Explode()
{
   // Tell other behavior scripts that we're dying
   if (!Network.isClient)
      gameObject.SendMessage("OnDeath", SendMessageOptions.DontRequireReceiver);

   Splat();

   var explosion : Transform = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
   var explosionParticle = explosion.GetComponent(ParticleSystem);
   explosionParticle.startColor = actualColor;
}

function FindTargets(targs : List.<GameObject>, range : float, checkLOS : boolean)
{
   var position = transform.position;
   targs.Clear();
   //var targs : List.<GameObject> = new List.<GameObject>();

   // Find all game objects with tag
   var objs : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");

   // Iterate through them and find the closest one
   for (var obj : GameObject in objs)
   {
      var unitScr : Unit = obj.GetComponent(Unit);
      if (unitScr.health > 0 && unitScr.isWalking)
      {
         var diff : Vector3 = (obj.transform.position - position);
         var dist : float = diff.magnitude;

         // Check object is in range...
         if (dist <= range)
           targs.Add(obj);
      }
   }
}

function OnNetworkInstantiate(info : NetworkMessageInfo)
{
   // Network instantiated, turn on netview
   netView.enabled = true;
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

private var lastActualColor : Color;
private var lastActualSize : float;
private var lastActualSpeed : float;
private var lastIsAttackable: boolean;

function SetActualColor(c : Color)
{
   SetActualColor(c.r, c.g, c.b);
}

@RPC
function SetActualColor(r : float, g : float, b : float)
{
   var newColor = Color(r,g,b);
   if (newColor != lastActualColor)
   {
      actualColor = newColor;
      lastActualColor = newColor;
      SetChildrenColor(transform, actualColor);
      if (Network.isServer)
         netView.RPC("SetActualColor", RPCMode.Others, r, g, b);
   }
}

@RPC
function SetActualSize(newSize : float)
{
   if (newSize != lastActualSize)
   {
      actualSize = newSize;
      lastActualSize = newSize;
      transform.localScale = Vector3.one * actualSize;
      if (Network.isServer)
         netView.RPC("SetActualSize", RPCMode.Others, newSize);
   }
}

@RPC
function SetActualSpeed(newSpeed : float)
{
   if (newSpeed != lastActualSpeed)
   {
      actualSpeed = newSpeed;
      lastActualSpeed = newSpeed;
      trail.enabled = (newSpeed > speed);
      if (Network.isServer)
         netView.RPC("SetActualSpeed", RPCMode.Others, newSpeed);
   }
}

@RPC
function SetAttackable(newAttackable : boolean)
{
   if (newAttackable != lastIsAttackable)
   {
      isAttackable = newAttackable;
      lastIsAttackable = newAttackable;
      if (Network.isServer)
         netView.RPC("SetAttackable", RPCMode.Others, newAttackable);
   }
}

@RPC
function UseAbility1()
{
   if (!usedAbility1)
   {
      usedAbility1 = true;
      SendMessage("OnAbility1", SendMessageOptions.DontRequireReceiver);
   
      if (Network.isServer)
         netView.RPC("UseAbility1", RPCMode.Others);
   }
}

function AttachHUD(hud : Transform)
{
   hudHealthBar = hud.FindChild("HealthBar").GetComponent(UISlider);
   hudHealthBar.gameObject.SetActive(isSelected);
   UIControl.GetUI((Game.player.isAttacker) ? 1 : 0).SendMessage("OnUnitSpawned", this, SendMessageOptions.DontRequireReceiver);
}

function OnSerializeNetworkView(stream : BitStream, info : NetworkMessageInfo)
{
   //stream.Serialize(actualSize);
   //stream.Serialize(actualColor.r);
   //stream.Serialize(actualColor.g);
   //stream.Serialize(actualColor.b);
   //stream.Serialize(actualColor.a);
   //stream.Serialize(health);
   //stream.Serialize(isAttackable);
   var nextWP : int = nextWaypoint;
   stream.Serialize(nextWP);
   //stream.Serialize(isWalking);

   //var rot : Quaternion = transform.localRotation;
   //stream.Serialize(rot);
   var pos : Vector3 = transform.position;
   stream.Serialize(pos);

   if (stream.isWriting)
   { }
   else
   {
      // Clientside synching to server
      var dist : float = Vector3.Distance(pos, transform.position);
      if (isWalking && dist > 1.0) // need to calc this value?
      {
         //Debug.Log("Repositioning unit to synch!");
         transform.position = pos;
         nextWaypoint = nextWP;
      }


      //transform.localRotation = rot;
      //transform.position = pos;
      //transform.localScale = Vector3(actualSize, actualSize, actualSize);
      //SetChildrenColor(transform, actualColor);
   }
}

//----------------
// LEAP INFO
//----------------
class LeapInfo
{
   var pos          : Vector3;
   var arcHeight    : float;
   var timeToImpact : float;
   var killOnImpact : boolean;
   var splatColor   : boolean;
}

//----------------
// UNIT ATTRIBUTES
//----------------
class UnitAttributes
{
   function UnitAttributes()
   {
      unitType = 0;
      size = 0;
      speed = 0;
      strength = 0;
      color = Game.defaultColor;
   }

   function UnitAttributes(copy : UnitAttributes)
   {
      Copy(copy);
   }

   function Copy(copy : UnitAttributes)
   {
      unitType = copy.unitType;
      size = copy.size;
      speed = copy.speed;
      strength = copy.strength;
      color = copy.color;
   }

   var unitType : int;
   var size  : float;
   var speed : float;
   var strength : float;
   var color : Color;
}
