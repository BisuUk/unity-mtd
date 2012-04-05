#pragma strict

var unitType : int;
var color : Color;
var size  : float;
var count : int;
var pathCaptureDist : float = 0.1;
var baseSpeed : float;
var squad : UnitSquad;
var health : int = maxHealth;
var netView : NetworkView;
var owner : NetworkPlayer;
var squadID : int; // For networking
private var speed : float;
private var path  : List.<Vector3>;
private var pathToFollow : Transform;
private var currentSize : float = 0;
private var maxHealth : int = 100;
private var prefabScale : Vector3;
private var minScale : Vector3;
private var playerData : PlayerData;
static private var explosionPrefab : Transform;
static private var damageTextPrefab : Transform;


//-----------
// UNIT
//-----------
static function PrefabName(unitType : int) : String
{
   var prefabName : String;
   prefabName = "prefabs/Unit"+unitType+"Prefab";
   return prefabName;
}


function Start()
{
   prefabScale = transform.localScale;
   minScale = prefabScale*0.5;
   if (explosionPrefab == null)
      explosionPrefab = Resources.Load("prefabs/fx/UnitExplosionPrefab", Transform);
   if (damageTextPrefab == null)
      damageTextPrefab = Resources.Load("prefabs/fx/Text3DPrefab", Transform);
   if (playerData == null)
   {
      var gameObj : GameObject = GameObject.Find("GameData");
      playerData = gameObj.GetComponent(PlayerData);
   }
}


function Update()
{
   if (Network.isServer)
   {
      currentSize = minScale.x + (1.0*health)/maxHealth * (size+minScale.x);

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
         netView.RPC("Explode", RPCMode.Others);


         Network.RemoveRPCs(netView.viewID);
         Network.Destroy(gameObject);
      }
   }

   // Check if user can select this unit, then select
   if (owner == Network.player && playerData.selectedSquad && playerData.selectedSquad.id == squadID)
   {
      transform.localScale = Vector3(
         currentSize + AttackGUI.pulsateScale,
         currentSize + AttackGUI.pulsateScale,
         currentSize + AttackGUI.pulsateScale);
   }
   else // ... not selected
   {
      transform.localScale = Vector3(currentSize, currentSize, currentSize);
   }
}

function SetPath(followPath : List.<Vector3>)
{
   path = new List.<Vector3>(followPath);
}

function SetAttributes(squad : UnitSquad)
{
   SetAttributes(squad.unitType, squad.size, squad.color);
}

function SetAttributes(pUnitType : int, pSize : float, pColor : Color)
{
   unitType = pUnitType;
   size = pSize;
   color = pColor;

   renderer.material.color = pColor;
   speed = baseSpeed + (8.0/unitType)*1.2; // this is going to change

   maxHealth = 100 + (pSize * 100);
   health = maxHealth;
   currentSize = pSize;
}

function OnMouseDown()
{
   if (owner == Network.player)
      playerData.SelectSquad(squadID);
}

@RPC
function Explode()
{
   var explosion : Transform = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
   var explosionParticle = explosion.GetComponent(ParticleSystem);
   explosionParticle.startColor = color;

   if (owner == Network.player)
   {
      var squad : UnitSquad = playerData.GetSquadByID(squadID);
      if (squad)
         squad.undeployUnit();
   }
}

@RPC
function DamageText(damage : int, colorRed : float, colorGreen : float, colorBlue : float)
{
   // Spawn local text prefab
   var textItem : Transform = Instantiate(damageTextPrefab, transform.position, Quaternion.identity);

   // Set text color - Attack = unit color / Defend = tower color
   var damageColor : Color = Color(colorRed, colorGreen, colorBlue);
   if (Camera.main.GetComponent(AttackGUI).enabled)
      damageColor = color;

   // Attach the bahavior script
   var rfx : RiseAndFadeFX = textItem.gameObject.AddComponent(RiseAndFadeFX);
   rfx.lifeTime = 0.75;
   rfx.startColor = damageColor;
   rfx.endColor = damageColor;
   rfx.endColor.a = 0.35;
   rfx.riseRate = 2.0;
   // Set text value
   var tm : TextMesh = textItem.GetComponent(TextMesh);
   tm.text = damage.ToString();
   tm.fontSize = 30;
   // Set start position
   textItem.transform.position = transform.position + (Camera.main.transform.up*1.0) + (Camera.main.transform.right*0.5);
}


function DoDamage(damage : int, colorRed : float, colorGreen : float, colorBlue : float)
{
   // Apply damage
   health -= damage;

   // Tell everyone to spawn floating damage text
   DamageText(damage, colorRed, colorGreen, colorBlue);
   netView.RPC("DamageText", RPCMode.Others, damage, colorRed, colorGreen, colorBlue);

   // If this unit was killed, tell everyone to splode, and remove from network
   if (health <= 0)
   {
      Explode();
      netView.RPC("Explode", RPCMode.Others);
      // Remove unit from world
      Network.RemoveRPCs(netView.viewID);
      Network.Destroy(gameObject);
   }
}


function OnNetworkInstantiate(info : NetworkMessageInfo)
{
   // Network instantiated, turn on netview
   netView.enabled = true;
}



function OnSerializeNetworkView(stream : BitStream, info : NetworkMessageInfo)
{
   stream.Serialize(owner);
   stream.Serialize(squadID);
   stream.Serialize(unitType);
   stream.Serialize(currentSize);
   stream.Serialize(color.r);
   stream.Serialize(color.g);
   stream.Serialize(color.b);
   stream.Serialize(color.a);
   stream.Serialize(health);


   var pos : Vector3 = transform.position;
   stream.Serialize(pos);

   if (stream.isWriting)
   {

   }
   else
   {
      transform.position = pos;
      renderer.material.color = color;
      transform.localScale = Vector3(currentSize, currentSize, currentSize);
   }
}


//-----------
// UNIT SQUAD
//-----------
class UnitSquad
{
   function UnitSquad()
   {
      id = 0;
      unitType = 8;
      size = 0;
      color = Color.white;
      init();
   }

   function UnitSquad(pId : int, pUnitType : int, pSize : float, pColor : Color)
   {
      id = pId;
      unitType = pUnitType;
      size = pSize;
      color = pColor;
      init();
   }

   // Copy constructor
   function UnitSquad(copy : UnitSquad)
   {
      unitType = copy.unitType;
      color = copy.color;
      size = copy.size;
      count = copy.count;
      id = copy.id;
      deployed = copy.deployed;
      unitsDeployed = copy.unitsDeployed;
      unitsToDeploy = copy.unitsToDeploy;
   }

   function init()
   {
      count = 1;
      deployed = false;
      unitsDeployed = 0;
      unitsToDeploy = 0;
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
   var count : int;
   var id : int;
   var deployed : boolean;
   var unitsDeployed : int;
   var unitsToDeploy : int;
   var owner : NetworkPlayer;
};
