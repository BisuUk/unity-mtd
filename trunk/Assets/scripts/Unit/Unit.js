#pragma strict

var sides : int;
var color : Color;
var size  : float;
var count : int;
var pathCaptureDist : float = 0.1;
var baseSpeed : float;
var squad : UnitSquad;
var player : PlayerData;
var health : int = maxHealth;

var netView : NetworkView;
//static var baseScale : Vector3 = Vector3(0.25, 0.25, 0.25);

private var speed : float;
private var path  : List.<Vector3>;
private var pathToFollow : Transform;
private var currentSize : float = 0;
private var maxHealth : int = 100;
private var prefabScale : Vector3;
private var minScale : Vector3;

static private var explosionPrefab : Transform;
static private var damageTextPrefab : Transform;

//-----------
// UNIT
//-----------
static function PrefabName(sides : int) : String
{
   var prefabName : String;
   prefabName = "prefabs/Unit"+sides+"Prefab";
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
}


function Update()
{
   if (netView.isMine)
   {
      if (path.Count > 0)
      {
         var p : Vector3 = path[0];
         transform.LookAt(p);
         transform.Translate(transform.forward * speed * Time.deltaTime, Space.World);
   
         var dist : float = Vector3.Distance(transform.position, p);
         if (dist < pathCaptureDist)
            path.RemoveAt(0);
   
         currentSize = minScale.x + (1.0*health)/maxHealth * (size+minScale.x);
         if (player.selectedSquadID == squad.id)
         {
            transform.localScale = Vector3(
               currentSize + HUD_Attack_GUI.pulsateScale,
               currentSize + HUD_Attack_GUI.pulsateScale,
               currentSize + HUD_Attack_GUI.pulsateScale);
         }
         else // ... not selected
         {
            transform.localScale = Vector3(currentSize, currentSize, currentSize);
            //Debug.Log("UNIT:healthScale="+healthScale+" health="+health+" maxHealth="+maxHealth+" size="+size+" scale="+transform.localScale.x);
         }
      }
      else // at end of path
      {
         //Debug.Log("Unit::Update: DESTROY!");
         if (netView.isMine)
            netView.RPC("Explode", RPCMode.All);
         // if not networked, Explode()
      }
   }
   else
   {

   }
}

function SetPath(followPath : List.<Vector3>)
{
   path = new List.<Vector3>(followPath);
}

function SetAttributes(squad : UnitSquad)
{
   SetAttributes(squad.sides, squad.size, squad.color);
}

function SetAttributes(pSides : int, pSize : float, pColor : Color)
{
   sides = pSides;
   size = pSize;
   color = pColor;

   renderer.material.color = pColor;
   speed = baseSpeed + (8.0/sides)*1.2;

   maxHealth = 100 + (pSize * 100);
   health = maxHealth;
   currentSize = pSize;
   //Debug.Log("SetAttributes: sides="+sides+" speed="+speed+" maxHealth="+maxHealth);
}

function OnMouseDown()
{
   player.selectedSquadID = squad.id;
}

@RPC
function Explode()
{
   squad.undeployUnit();
   var explosion : Transform = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
   var explosionParticle = explosion.GetComponent(ParticleSystem);
   explosionParticle.startColor = color;
   Destroy(gameObject);
}

function DamageText(damage : float, damageColor : Color)
{
   var textItem : Transform = Instantiate(damageTextPrefab, transform.position, Quaternion.identity);

   var rfx : RiseAndFadeFX = textItem.gameObject.AddComponent(RiseAndFadeFX);
   rfx.lifeTime = 0.75;
   rfx.startColor = color;
   rfx.endColor = color;
   rfx.endColor.a = 0.35;
   rfx.riseRate = 2.0;

   var tm : TextMesh = textItem.GetComponent(TextMesh);
   tm.text = damage.ToString();
   tm.fontSize = 30;

   textItem.transform.position = transform.position + (Camera.main.transform.up*1.0) + (Camera.main.transform.right*0.5);
}


function DoDamage(damage : float, damageColor : Color) : boolean
{
   DamageText(damage, damageColor);

   health -= damage;
   //Debug.Log("DoDamage: damage="+damage+" health="+health);
   if (health <= 0)
   {
      if (netView.isMine)
         netView.RPC("Explode", RPCMode.All);
      return false;
   }
   return true;
}


function OnNetworkInstantiate (info : NetworkMessageInfo)
{
   // Network instantiated, turn on netview
   netView.enabled = true;
}

//-----------
// UNIT SQUAD
//-----------
class UnitSquad
{
   function UnitSquad()
   {
      id = 0;
      sides = 8;
      size = 0;
      color = Color.white;
      init();
   }

   function UnitSquad(pId : int, pSides : int, pSize : float, pColor : Color)
   {
      id = pId;
      sides = pSides;
      size = pSize;
      color = pColor;
      init();
   }

   // Copy constructor
   function UnitSquad(copy : UnitSquad)
   {
      sides = copy.sides;
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

   var sides : int;
   var color : Color;
   var size  : float;
   var count : int;
   var id : int;
   var deployed : boolean;
   var unitsDeployed : int;
   var unitsToDeploy : int;
};



function OnSerializeNetworkView(stream : BitStream, info : NetworkMessageInfo)
{
   stream.Serialize(sides);
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
