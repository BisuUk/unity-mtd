#pragma strict

var ID : int;
var unitType : int;
var size  : float;
var speed : float;
var strength : float;
var color : Color;
var pathCaptureDist : float = 0.1;
var health : int = maxHealth;
var netView : NetworkView;
var owner : NetworkPlayer;
var unpauseTime : float;
var maxHealth : int = 100;
//var squad : UnitSquad;
//var squadID : int; // For networking

private var path : List.<Vector3>;
private var pathToFollow : Transform;
private var currentSize : float = 0;
private var prefabScale : Vector3;
private var minScale : Vector3;
private var buffs : Dictionary.<int, Effects>;
private var debuffs : Dictionary.<int, Effects>;

static private var explosionPrefab : Transform;
static private var floatingTextPrefab : Transform;

//-----------
// UNIT
//-----------
static function PrefabName(unitType : int) : String
{
   var prefabName : String;
   prefabName = "prefabs/Unit"+(unitType+1)+"Prefab";
   return prefabName;
}

function Start()
{
   prefabScale = transform.localScale;
   minScale = prefabScale*0.5;
   if (explosionPrefab == null)
      explosionPrefab = Resources.Load("prefabs/fx/UnitExplosionPrefab", Transform);
   if (floatingTextPrefab == null)
      floatingTextPrefab = Resources.Load("prefabs/fx/Text3DPrefab", Transform);

   buffs = new Dictionary.<int, Effects>();
   debuffs = new Dictionary.<int, Effects>();
}

function Update()
{
   if (Network.isServer || GameData.hostType==0)
   {
      currentSize = minScale.x + (1.0*health)/maxHealth * (size+minScale.x);

      if (unpauseTime == 0.0)
      {
         if (path.Count > 0)
         {
            var p : Vector3 = path[0];
            transform.LookAt(p);
            transform.Translate(transform.forward * speed * Time.deltaTime, Space.World);
      
            var dist : float = Vector3.Distance(transform.position, p);
            if (dist < pathCaptureDist)
               path.RemoveAt(0);
         }
         else // at end of path
         {
            Explode();
            if (GameData.hostType>0)
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
   }

   // Check if user can select this unit, then select

//   if (owner == Network.player && GameData.player.selectedSquad && GameData.player.selectedSquad.id == squadID)
//   {
//      transform.localScale = Vector3(
//         currentSize + AttackGUI.pulsateScale,
//         currentSize + AttackGUI.pulsateScale,
//         currentSize + AttackGUI.pulsateScale);
//   }
//   else // ... not selected
//   {
         transform.localScale = Vector3(currentSize, currentSize, currentSize);
//   }
}

function SetPath(followPath : List.<Vector3>)
{
   path = new List.<Vector3>(followPath);
}

/*
function SetAttributes(squad : UnitSquad)
{
   SetAttributes(squad.unitType, squad.size, squad.speed, squad.effect, squad.color);
}
*/

function SetAttributes(ua : UnitAttributes)
{
   SetAttributes(ua.unitType, ua.size, ua.speed, ua.strength, ua.color);
}

function SetAttributes(pUnitType : int, pSize : float, pSpeed : float, pStrength : float, pColor : Color)
{
   unitType = pUnitType;
   size = pSize;
   speed = pSpeed;
   strength = pStrength;
   color = pColor;
   renderer.material.color = pColor;

   maxHealth = 100 + (pSize * 100);
   health = maxHealth;
   currentSize = pSize;
}

/*
function OnMouseDown()
{
   if (owner == Network.player)
      GameData.player.SelectSquad(squadID);
}
*/

@RPC
function Explode()
{
   var explosion : Transform = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
   var explosionParticle = explosion.GetComponent(ParticleSystem);
   explosionParticle.startColor = color;
/*
   if (owner == Network.player || GameData.hostType==0)
   {
      var squad : UnitSquad = GameData.player.GetSquadByID(squadID);
      if (squad)
         squad.undeployUnit();
   }
*/
}

@RPC
function FloatingText(str : String, colorRed : float, colorGreen : float, colorBlue : float)
{
   // Spawn local text prefab
   var textItem : Transform = Instantiate(floatingTextPrefab, transform.position, Quaternion.identity);

   // Set text color - Attack = unit color / Defend = tower color
   var textColor : Color = Color(colorRed, colorGreen, colorBlue);
   if (Camera.main.GetComponent(AttackGUI).enabled)
     textColor = color;

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

function ApplyHealing(amount : int, color : Color) : boolean
{
   // Already at full health
   if (health >= maxHealth)
      return false;

   health += amount;

   // Cap at max health, only display amount of healing
   if (health > maxHealth)
   {
      amount = health-maxHealth;
      health = maxHealth;
   }

   if (amount > 0)
   {
      // Tell everyone to spawn floating damage text
      var str : String = "+"+amount.ToString();
      FloatingText(str, color.r, color.g, color.b);
      if (GameData.hostType > 0)
         netView.RPC("FloatingText", RPCMode.Others, str, color.r, color.g, color.b);
   }

   return true;
}

function ApplyDamage(amount : int, colorRed : float, colorGreen : float, colorBlue : float)
{
   // Apply value
   health -= amount;

   // Tell everyone to spawn floating damage text
   var str : String = amount.ToString();
   FloatingText(str, colorRed, colorGreen, colorBlue);
   if (GameData.hostType > 0)
      netView.RPC("FloatingText", RPCMode.Others, str, colorRed, colorGreen, colorBlue);

   // If this unit was killed, tell everyone to splode, and remove from network
   if (health <= 0)
   {
      Explode();
      if (GameData.hostType > 0)
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
   stream.Serialize(owner);
   //stream.Serialize(squadID);
   stream.Serialize(unitType);
   stream.Serialize(currentSize);
   stream.Serialize(color.r);
   stream.Serialize(color.g);
   stream.Serialize(color.b);
   stream.Serialize(color.a);
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
      renderer.material.color = color;
      transform.localScale = Vector3(currentSize, currentSize, currentSize);
   }
}

//----------------
// UNIT ATTRIBUTES
//----------------
class UnitAttributes
{
   function UnitAttributes()
   {
      id = 0;
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
      //id = copy.id;
      unitType = copy.unitType;
      size = copy.size;
      speed = copy.speed;
      strength = copy.strength;
      color = copy.color;
   }

   var id : int;
   var unitType : int;
   var size  : float;
   var speed : float;
   var strength : float;
   var color : Color;
}

//----------------
// EFFECTS
//----------------
class Effects
{
   var damageModifier : float;
   var damageEndTime : float;

   var speedModifier : float;
   var speedEndTime : float;

   var colorValue : float;
};


/*
//-----------
// UNIT SQUAD
//-----------
class UnitSquad
{
   function UnitSquad()
   {
      Initialize();
   }

   function UnitSquad(pID : int, pUnitType : int, pSize : float, pSpeed : float, pEffect : float, pCount : int, pColor : Color)
   {
      id = pID;
      unitType = pUnitType;
      size = pSize;
      speed = pSpeed;
      effect = pEffect;
      count = pCount;
      color = pColor;
   }

   // Copy constructor
   function UnitSquad(copy : UnitSquad)
   {
      Copy(copy);
   }

   function Copy(copy : UnitSquad)
   {
      id = copy.id;
      unitType = copy.unitType;
      deployed = copy.deployed;
      unitsDeployed = copy.unitsDeployed;
      unitsToDeploy = copy.unitsToDeploy;
      CopyAttributes(copy);
   }

   function Initialize()
   {
      id = 0;
      unitType = 8;
      speed = 1;
      effect = 1;
      size = 0;
      color = Color.white;
      init();
   }

   private function init()
   {
      count = 1;
      deployed = false;
      unitsDeployed = 0;
      unitsToDeploy = 0;
   }

   function CopyAttributes(copy : UnitSquad)
   {
      color = copy.color;
      size = copy.size;
      speed = copy.speed;
      effect = copy.effect;
      count = copy.count;
   }


   function deployUnit()
   {
      unitsToDeploy -= 1;
      unitsDeployed += 1;
      deployed = true;
      //Debug.Log("UnitSquad::deployUnit: unitsDeployed="+unitsDeployed+ " deployed="+deployed);
   }

   function undeployUnit()
   {
      unitsDeployed -= 1;
      // If we're done deploying, and we've lost all units... squad is no longer deployed
      if (unitsToDeploy == 0 && unitsDeployed == 0)
         deployed = false;
      //Debug.Log("UnitSquad::undeployUnit: unitsDeployed="+unitsDeployed+ " deployed="+deployed);
   }

   var unitType : int;
   var color : Color;
   var size  : float;
   var speed : float;
   var effect : float;
   var count : int;
   var id : int;
   var deployed : boolean;
   var unitsDeployed : int;
   var unitsToDeploy : int;
   var owner : NetworkPlayer;
};
*/