#pragma strict
#pragma downcast

var leftPos : Transform;
var rightPos: Transform;
var spawnPos : Transform;
var walkStartPos : Transform;
var followPath : Transform;
var character : GameObject;
var spray : Transform;
var netView : NetworkView;

private var path : List.<Vector3>;
private var leftUnit : Unit;
private var rightUnit : Unit;
private var numUnitsContained : int;
private var mixColor : Color;
private var newUnit : Unit;


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

         numUnitsContained += 1;
         if (numUnitsContained == 2)
            Mix();
      }
   }
}

function Mix()
{
   mixColor = GetMixColor(leftUnit.color, rightUnit.color);

   if (character)
      character.animation.Play("mix");

   Invoke("Stage1", 0.5);
   Invoke("Stage2", 1.5);
   Invoke("Recover", 3.0);
}

function SpawnNewUnit()
{
   var unitAttr : UnitAttributes = new UnitAttributes();
   unitAttr.unitType = 0;
   //unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, launchSpeed);
   unitAttr.speed = leftUnit.speed;
   unitAttr.color = mixColor;

   var newUnitObject : GameObject;
   var prefabName : String = Unit.PrefabName(unitAttr.unitType);

   if (Network.isServer)
      newUnitObject = Network.Instantiate(Resources.Load(prefabName, GameObject), spawnPos.position, spawnPos.rotation, 0);
   else
      newUnitObject = Instantiate(Resources.Load(prefabName, GameObject), spawnPos.position, spawnPos.rotation);

   newUnit = newUnitObject.GetComponent(Unit);
   newUnit.ID = Utility.GetUniqueID();
   newUnit.SetAttributes(unitAttr);

   // Send attributes to client so it can calculate FX like radii etc.
   if (Network.isServer)
   {
      newUnit.netView.RPC("ClientSetAttributes", RPCMode.Others,
         unitAttr.unitType, unitAttr.size, unitAttr.speed, unitAttr.strength,
         unitAttr.color.r, unitAttr.color.g, unitAttr.color.b, netView.viewID);
   }
}

function Stage1()
{
   spray.particleSystem.startColor = mixColor;
   spray.particleSystem.Play();
}

function Stage2()
{
   SpawnNewUnit();
   spray.particleSystem.Stop();

   if (leftUnit)
      leftUnit.Kill();
   if (rightUnit)
      rightUnit.Kill();
}

function Recover()
{
   PostLaunch(newUnit);
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
      return color1;
   }
   return color1;
}

function PostLaunch(unit : Unit)
{
   unit.LeapTo(walkStartPos.position);
   unit.SetPath(path);
}
