#pragma strict

var sides : int;
var color : Color;
var size  : float;
var count : int;
var pathCaptureDist : float = 0.1;
var baseSpeed : float;
var squad : UnitSquad;
var player : PlayerData;
static var baseScale : Vector3 = Vector3(0.25, 0.25, 0.25);

private var speed : float;
private var path  : List.<Vector3>;
private var pathToFollow : Transform;
private var currentSize : float = 0;
private var maxHealth : int = 0;
private var health : int = 0;

//-----------
// UNIT
//-----------
static function PrefabName(sides : int) : String
{
   var prefabName : String;

   prefabName = "prefabs/Unit"+sides+"Prefab";

//   if (sides > 5)
//      prefabName = "prefabs/Unit"+sides+"Prefab";
//   else
//      prefabName = "prefabs/Unit5Prefab";

   //switch (sides)
   //{
   //   case 3: prefabName = "UnitCylinderPrefab"; break;
   //   default: prefabName = "UnitCubePrefab"; break;
   //}
   return prefabName;
}

function Update()
{
   if (path.Count > 0)
   {
      var p : Vector3 = path[0];
      transform.LookAt(p);
      transform.Translate(transform.forward * speed * Time.deltaTime, Space.World);

      var dist : float = Vector3.Distance(transform.position, p);
      if (dist < pathCaptureDist)
         path.RemoveAt(0);

      if (player.selectedSquadID == squad.id)
      {
         transform.localScale = Vector3(
            baseScale.x + size + HUD_Attack_GUI.pulsateScale,
            baseScale.y + size + HUD_Attack_GUI.pulsateScale,
            baseScale.z + size + HUD_Attack_GUI.pulsateScale);
      }
      else
      {
         transform.localScale = Vector3(baseScale.x + size, baseScale.y + size,  baseScale.z + size);
      }
   }
   else
   {
      //Debug.Log("Unit::Update: DESTROY!");
      squad.undeployUnit();
      Destroy(gameObject);
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

   transform.localScale = Vector3(baseScale.x + size, baseScale.y + size,  baseScale.z + size);
   renderer.material.color = pColor;
   speed = baseSpeed + (8.0/sides)*1.2;

   maxHealth = 100 + (pSize * 100);
   currentSize = pSize;
   //Debug.Log("SetAttributes: sides="+sides+" speed="+speed);
}

function OnMouseDown()
{
   player.selectedSquadID = squad.id;
}

function ApplyDamage(damage : float)
{
   Debug.Log("ApplyDamage: damage="+damage);
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

