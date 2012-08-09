#pragma strict
#pragma downcast

var ID : int;
var squadID : int;
var unitType : int;
var size  : float;
var scaleLimits  : Vector2;
var healthLimits : Vector2;
var character : GameObject;
var strength : float;
var color : Color;
var actualSize : float;
var actualColor : Color;
var actualSpeed : float;
var speed : float;
var health : int;
var maxHealth : int;
var isAttackable : boolean;
var costs : UnitCost;
var AOE : Transform;
var trail : TrailRenderer;
var netView : NetworkView;
var nextWaypoint : int;
var isWalking : boolean;
var slopeMult : float;
var emitter : Emitter;

private var path : List.<Vector3>;
private var pathToFollow : Transform;
private var pointCaptureCount : int;
private var prefabScale : Vector3;
private var minScale : Vector3;
private var nextColorRecoveryTime : float;
private var pathCaptureDist : float = 0.5;
private var buffs : Dictionary.< int, List.<Effect> >;
private var debuffs : Dictionary.< int, List.<Effect> >;
private var lastHeight : float;
private var slopeSpeedMult : float;
private var didFirstLeap : boolean;


static private var explosionPrefab : Transform;
static private var floatingTextPrefab : Transform;
static private var mitigationFXPrefab : Transform;
static private var colorRecoveryInterval : float = 0.275;

//-----------
// UNIT
//-----------
static function PrefabName(unitType : int) : String
{
   var prefabName : String;
   prefabName = "prefabs/units/Unit"+(unitType+1)+"Prefab";
   return prefabName;
}

function Awake()
{
   isWalking = false;
   isAttackable = false;
   collider.enabled = false;
   didFirstLeap = false;
   prefabScale = transform.localScale;
   minScale = prefabScale;
   if (explosionPrefab == null)
      explosionPrefab = Resources.Load("prefabs/fx/UnitExplosionPrefab", Transform);
   if (floatingTextPrefab == null)
      floatingTextPrefab = Resources.Load("prefabs/fx/Text3DPrefab", Transform);
   if (mitigationFXPrefab == null)
      mitigationFXPrefab = Resources.Load("prefabs/fx/UnitShieldFXPrefab", Transform);

   buffs = new Dictionary.< int, List.<Effect> >();
   debuffs = new Dictionary.< int, List.<Effect> >();
   nextColorRecoveryTime = 0.0;
}

@RPC
function StartWalking()
{
   isWalking = true;
   if (character)
      character.animation.Play("walk");

   // Set clickable
   collider.enabled = true;

   // Set attackable
   isAttackable = true;
   lastIsAttackable = true;

   if (Network.isServer)
      netView.RPC("StartWalking", RPCMode.Others);
}

function DoWalking()
{
   var waypoint : Vector3;
   var wayGroundPos : Vector3;
   var newPos : Vector3;
   var groundPos : Vector3;
   var forwardVec : Vector3;
   var dist : float;
   var rcHit : RaycastHit;
   var theRay : Vector3 = Vector3.down;
   var mask : int = 1 << 10; // terrain

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
   dist = forwardVec.magnitude;
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
   newPos = transform.position + (forwardVec * actualSpeed * Time.deltaTime);
   newPos.y += 500;

   // Align this new position with the terrain
   if (Physics.Raycast(newPos, theRay, rcHit, 1000, mask))
   {
      transform.rotation = Quaternion.FromToRotation(Vector3.up, rcHit.normal) * Quaternion.LookRotation(forwardVec);
      transform.position = rcHit.point + (Vector3.up*0.5);
   }

   // If we've captured a waypoint, pop queue for next waypoint
   if (dist < pathCaptureDist)
   {
      if (Network.isClient)
      {
         if (dist < pathCaptureDist)
         {
            if (nextWaypoint < (path.Count-1))
               nextWaypoint += 1;
         }
      }
      else // Server & singlePlayer
      {
         pointCaptureCount += 1;
         nextWaypoint += 1;
   
         // Check if we're at the end of the path
         if (nextWaypoint > (path.Count-1))
         {
            // Add to score
            if (unitType == 0)
               Game.control.Score(1);
   
            // Do explosion FX
            Explode();
            if (Game.hostType>0)
            {
               netView.RPC("Explode", RPCMode.Others);
               Network.RemoveRPCs(netView.viewID);
               Network.Destroy(gameObject);
            }
            else
            {
               Destroy(gameObject);
            }
         }
      }
   }

   UpdateWalkAnimationSpeed();
}


function Update()
{
   if (isWalking)
   {
      // Reset actuals, buffs/debuffs will recalculate
      actualSpeed = speed;
      // NOTE: "1.0*" is float cast
      var healthScaleModifier : float = ((1.0*health/maxHealth)<0.5) ? 0.5 : (1.0*health/maxHealth);
      actualSize = (Mathf.Lerp(scaleLimits.x, scaleLimits.y, size)) * healthScaleModifier;
   
      // Update any (de)buff effects
      UpdateBuffs();
      UpdateDebuffs();
   
      // Set actuals, diff conditionals are inside functions
      SetActualColor(actualColor.r, actualColor.g, actualColor.b);
      SetActualSpeed(actualSpeed);
      SetActualSize(actualSize);

      //if (path && path.Count > 0)
         DoWalking();
   }




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
         nextColorRecoveryTime = Time.time + colorRecoveryInterval;
      }
      SetChildrenColor(transform, actualColor);
   }
*/
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
               case Effect.Types.EFFECT_SPEED:
                  //actualSpeed += (actualSpeed*(Utility.ColorMatch(actualColor, buff.color) * buff.val));
                  actualSpeed += (speed*(Utility.ColorMatch(actualColor, buff.color) * buff.val));
                  newShowTrail = true;
                  //Debug.Log("actual="+actualSpeed+" buff.val="+buff.val);
               break;
               case Effect.Types.EFFECT_SHIELD:
                  newIsAttackable = false;
               break;
            }
         }
         // If on interval, check if it is time to apply
         else if (Time.time >= buff.nextFireTime)
         {
            switch (buff.type)
            {
               case Effect.Types.EFFECT_HEALTH:
               // HoT can tick here...
               break;
               case Effect.Types.EFFECT_COLOR:
                  actualColor = Color.Lerp(actualColor, buff.color, (buff.val*0.33));
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
               case Effect.Types.EFFECT_SPEED:
                  actualSpeed *= (1.0-(Utility.ColorMatch(actualColor, debuff.color) * debuff.val));
                  // Check for color & minimum speed cap
                  if (actualSpeed < 0.33)
                     actualSpeed = 0.33;
                  //Debug.Log("actual="+actualSpeed+" debuff.val="+debuff.val);
               break;
            }
         }
         // If on interval, check if it is time to apply
         else if (Time.time >= debuff.nextFireTime)
         {
            switch (debuff.type)
            {
               case Effect.Types.EFFECT_COLOR:
                  actualColor = Color.Lerp(actualColor, debuff.color, (debuff.val*0.33));
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
      transform.LookAt(path[0]);
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
   SetColor(pColor);
   actualColor = pColor;
   //maxHealth = 100 + (pSize * 400);

   maxHealth = Mathf.Lerp(healthLimits.x, healthLimits.y, size);
   health = maxHealth;

   actualSize = Mathf.Lerp(scaleLimits.x, scaleLimits.y, size);
   transform.localScale = Vector3.one * actualSize;

   // Leap from leap-position to pot
   var leapScr1 : BallisticProjectile = transform.GetComponent(BallisticProjectile);
   if (emitter)
   {
      leapScr1.targetPos = emitter.splashPosition.position;
      leapScr1.completeTarget = transform;
      leapScr1.Fire();
   }

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
         emitter = obj.GetComponent(Emitter);
         path = emitter.path;

         // Leap from leap-position to pot
         var leapScr1 : BallisticProjectile = transform.GetComponent(BallisticProjectile);
         if (emitter)
         {
            leapScr1.targetPos = emitter.splashPosition.position;
            leapScr1.completeTarget = transform;
            leapScr1.Fire();
         }
         break;
      }
   }
}

function OnProjectileImpact()
{
   if (didFirstLeap)
   {
      if (!Network.isClient)
         StartWalking();
   }
   else
   {
      // Now leap from pot to ground
      didFirstLeap = true;
      var leapScr1 : BallisticProjectile = GetComponent(BallisticProjectile);
      leapScr1.targetPos = emitter.emitPosition.position;
      //leapScr1.arcHeight = 20;
      leapScr1.Fire();
   }
}


function SetColor(newColor : Color)
{
   color = newColor;
   SetChildrenColor(transform, color);
}

private function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t == AOE || !t.renderer)
      return;
   t.renderer.material.color = newColor;
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
function Explode()
{
   // Tell other behavior scripts that we're dying
   if (Network.isServer || Game.hostType==0)
      gameObject.SendMessage("OnDeath", SendMessageOptions.DontRequireReceiver);

   var explosion : Transform = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
   var explosionParticle = explosion.GetComponent(ParticleSystem);
   explosionParticle.startColor = actualColor;
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
   {
      Explode();
      if (Game.hostType > 0)
      {
         netView.RPC("Explode", RPCMode.Others);
         // Remove unit from world
         Network.RemoveRPCs(netView.viewID);
         Network.Destroy(gameObject);
      }
      else
      {
         Destroy(gameObject);
      }
   }
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
            case Effect.Types.EFFECT_SHIELD:
               newAmount -= (newAmount * ((1.0-Utility.ColorMatch(damageColor, buff.color)) * buff.val));
               //Debug.Log("MitigateDamage="+amount+" >> "+newAmount);
            break;
         }
      }
   }
   //Debug.Log("MitigateDamage="+amount+">>"+newAmount);
   return Mathf.CeilToInt(newAmount);
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


function Cost() : int
{
   var c : float = costs.Cost(size, strength);
   var colorDiff : float = (1.0-Utility.ColorMatch(color, Color.white));
   c += ((c) * colorDiff);
   return c;
   //return costs.Cost(size, strength) + costs.ColorDiffCost(color, Color.white);
}

function TimeCost() : float
{
   var c : float = costs.TimeCost(size, strength);
   var colorDiff : float = (1.0-Utility.ColorMatch(color, Color.white));
   c += ((c) * colorDiff);
   return c;
   //return costs.TimeCost(size, strength) + costs.ColorDiffTimeCost(color, Color.white);
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
   stream.Serialize(isWalking);

   //var rot : Quaternion = transform.localRotation;
   //stream.Serialize(rot);
   var pos : Vector3 = transform.position;
   stream.Serialize(pos);

   if (stream.isWriting)
   { }
   else
   {
      var dist : float = Vector3.Distance(pos, transform.position);
      if (dist > 1.0) // need to calc this value
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


private var lastActualColor : Color;
private var lastActualSize : float;
private var lastActualSpeed : float;
private var lastIsAttackable: boolean;

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
      color = Color.white;
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
