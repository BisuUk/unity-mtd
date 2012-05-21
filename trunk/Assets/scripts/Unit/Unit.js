#pragma strict
#pragma downcast

var ID : int;
var unitType : int;
var size  : float;
var strength : float;
var color : Color;
var actualSize : float;
var actualColor : Color;
var actualSpeed : float;
var speed : float;
var health : int;
var maxHealth : int;
var unpauseTime : float;
var isAttackable : boolean;
var costs : UnitCost;
var AOE : Transform;
var netView : NetworkView;

private var path : List.<Vector3>;
private var pathToFollow : Transform;
private var pointCaptureCount : int;
private var prefabScale : Vector3;
private var minScale : Vector3;
private var nextColorRecoveryTime : float;
private var pathCaptureDist : float = 0.1;
private var buffs : Dictionary.< int, List.<Effect> >;
private var debuffs : Dictionary.< int, List.<Effect> >;

static private var explosionPrefab : Transform;
static private var floatingTextPrefab : Transform;
static private var mitigationFXPrefab : Transform;
static private var colorRecoveryInterval : float = 0.2;

//-----------
// UNIT
//-----------
static function PrefabName(unitType : int) : String
{
   var prefabName : String;
   prefabName = "prefabs/Unit"+(unitType+1)+"Prefab";
   return prefabName;
}

function Awake()
{
   isAttackable = false;
   prefabScale = transform.localScale;
   minScale = prefabScale*0.5;
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

function Update()
{
   if (Network.isServer || Game.hostType==0)
   {
      if (unpauseTime == 0.0)
      {
         // Move toward next waypoint
         if (path.Count > 0)
         {
            var p : Vector3 = path[0];
            transform.LookAt(p);
            transform.Translate(transform.forward * actualSpeed * Time.deltaTime, Space.World);

            // If we've captured a waypoint, pop queue for next waypoint
            var dist : float = Vector3.Distance(transform.position, p);
            if (dist < pathCaptureDist)
            {
               // Attackable after emitposition and first point captured
               pointCaptureCount += 1;
               if (pointCaptureCount>=2)
                  isAttackable = true;
               path.RemoveAt(0);
            }
         }
         else // at end of path
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
      else if (Time.time >= unpauseTime)
      {
         unpauseTime = 0.0; // time to start moving
      }

      // Reset actuals, buffs/debuffs will recalculate
      actualSpeed = speed;
      actualSize = minScale.x + (1.0*health)/maxHealth * (size+minScale.x);
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

      // Update any (de)buff effects
      UpdateBuffs();
      UpdateDebuffs();
   }

   // Set size on client and server
   transform.localScale = Vector3(actualSize, actualSize, actualSize);
}

function UpdateBuffs()
{
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
                  actualSpeed += (actualSpeed*(Utility.ColorMatch(actualColor, buff.color) * buff.val));
                  //Debug.Log("actual="+actualSpeed+" buff.val="+buff.val);
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
                  actualColor = Color.Lerp(actualColor, debuff.color, debuff.val);
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
   maxHealth = 100 + (pSize * 400);
   health = maxHealth;
   actualSize = minScale.x + (1.0*health)/maxHealth * (size+minScale.x);
   transform.localScale = Vector3(actualSize, actualSize, actualSize);

   gameObject.SendMessage("AttributesChanged", SendMessageOptions.DontRequireReceiver);
}

function SetColor(newColor : Color)
{
   color = newColor;
   SetChildrenColor(transform, color);
   gameObject.SendMessage("AttributesChanged", SendMessageOptions.DontRequireReceiver);
}

private function SetChildrenColor(t : Transform, newColor : Color)
{
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
   if (t == AOE)
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
   t.renderer.enabled = visible;
   for (var child : Transform in t)
      SetChildrenVisible(child, visible);
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

function ApplyBuff(applierID : int, effect : Effect, replace : boolean)
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
            if (replace)
               buff = effect;
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

function ApplyDebuff(applierID : int, effect : Effect, replace : boolean)
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
            if (replace)
               debuff = effect;
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
      if (unitScr.health > 0 && unitScr.unpauseTime == 0.0)
      {
         var diff = (obj.transform.position - position);
         var dist = diff.magnitude;

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
   //stream.Serialize(unitType);
   stream.Serialize(actualSize);
   stream.Serialize(actualColor.r);
   stream.Serialize(actualColor.g);
   stream.Serialize(actualColor.b);
   stream.Serialize(actualColor.a);
   stream.Serialize(health);
   var rot : Quaternion = transform.localRotation;
   stream.Serialize(rot);
   var pos : Vector3 = transform.position;
   stream.Serialize(pos);

   if (stream.isWriting)
   {
   }
   else
   {
      transform.localRotation = rot;
      transform.position = pos;
      transform.localScale = Vector3(actualSize, actualSize, actualSize);
      SetChildrenColor(transform, actualColor);
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