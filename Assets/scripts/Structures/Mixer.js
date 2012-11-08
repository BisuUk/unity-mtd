#pragma strict

var leftPos : Transform;
var rightPos: Transform;
var spawnPos : Transform;
var walkStartPos : Transform;
var followPath : Transform;
var character : GameObject;
var netView : NetworkView;

private var path : List.<Vector3>;
private var leftUnit : Unit;
private var rightUnit : Unit;
private var numUnitsContained : int;


function Start()
{
   // Parse path for this emitter
   path = new List.<Vector3>();
   if (followPath != null)
   {
      var tempTransforms = followPath.GetComponentsInChildren(Transform);
      path.Add(walkStartPos.position);
      for (var tr : Transform in tempTransforms)
      {
         if (tr != followPath.transform)
            path.Add(tr.position);
      }
   }
}

function OnTriggerEnter(other : Collider)
{
   var unit : Unit = other.GetComponent(Unit);
   if (unit)
   {
      if (numUnitsContained==2)
      {
         unit.ReversePath();
      }
      else
      {
         unit.SetWalking(false);
         if (numUnitsContained == 1)
            leftUnit = unit;
         else
            rightUnit = unit;

         unit.SetPosition((numUnitsContained == 1) ? leftPos.position : rightPos.position);
         unit.transform.parent = (numUnitsContained == 1) ? leftPos : rightPos;
         numUnitsContained += 1;
         if (numUnitsContained == 2)
            Mix();
      }
   }
}

function Mix()
{
   if (character)
      character.animation.Play("mix");
   Invoke("Combine", 1.5);
   Invoke("Recover", 3.0);
}

function SpawnNewUnit()
{
   var unitAttr : UnitAttributes = new UnitAttributes();
   unitAttr.unitType = 0;
   //unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, launchSpeed);
   unitAttr.speed = leftUnit.speed;
   unitAttr.color = GetMixColor(leftUnit.color, rightUnit.color);

   var newUnit : GameObject;
   var prefabName : String = Unit.PrefabName(unitAttr.unitType);

   if (Network.isServer)
      newUnit = Network.Instantiate(Resources.Load(prefabName, GameObject), spawnPos.position, Quaternion.identity, 0);
   else
      newUnit = Instantiate(Resources.Load(prefabName, GameObject), spawnPos.position, Quaternion.identity);

   var newUnitScr : Unit = newUnit.GetComponent(Unit);
   newUnitScr.ID = Utility.GetUniqueID();
   newUnitScr.SetAttributes(unitAttr);

   // Send attributes to client so it can calculate FX like radii etc.
   if (Network.isServer)
   {
      newUnitScr.netView.RPC("ClientSetAttributes", RPCMode.Others,
         unitAttr.unitType, unitAttr.size, unitAttr.speed, unitAttr.strength,
         unitAttr.color.r, unitAttr.color.g, unitAttr.color.b, netView.viewID);
   }

   PostLaunch(newUnitScr);
}

function Combine()
{
   SpawnNewUnit();

   if (leftUnit)
      leftUnit.Kill();
   if (rightUnit)
      rightUnit.Kill();
}

function Recover()
{
   numUnitsContained = 0;
}

function GetMixColor(color1 : Color, color2 : Color) : Color
{
   if (color1 == Color.red)
   {
      if (color2 == Color.yellow)
         return Color(1.0, 0.5, 0.0, 1.0); // orange
      else if (color2 == Color.blue)
         return Color.magenta;
      else
         return Color.red;
   }
   else if (color1 == Color.yellow)
   {
      if (color2 == Color.red)
         return Color(1.0, 0.5, 0.0, 1.0); // orange
      else if (color2 == Color.blue)
         return Color.green;
      else
         return Color.yellow;
   }
   else if (color1 == Color.blue)
   {
      if (color2 == Color.red)
         return Color.magenta;
      else if (color2 == Color.yellow)
         return Color.green;
      else
         return Color.blue;
   }
   else
   {
      //var mix2 : Color = GetMixColor(color2, color1);
      //return (mix2 != color1) : mix2 : color1;
   }
}

function PostLaunch(unit : Unit)
{
   unit.LeapTo(walkStartPos.position);
   unit.SetPath(path);
}
