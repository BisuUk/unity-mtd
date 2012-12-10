#pragma strict
#pragma downcast

var standPos : Transform;
var walkStartPos : Transform;
var followPath : Transform;
var character : GameObject;
var spray : Transform;
var paintColor : Color;
var netView : NetworkView;

private var path : List.<Vector3>;
private var containedUnit : Unit;
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
      if (numUnitsContained==1)
      {
         unit.ReversePath();
      }
      else
      {
         unit.SetWalking(false);
         containedUnit = unit;

         unit.SetPosition(standPos.position);
         numUnitsContained = 1;
         Paint();
      }
   }
}

function Paint()
{
   if (character)
      character.animation.Play("paint");

   Invoke("Stage1", 0.5);
}

function Stage1()
{
   if (!containedUnit)
      return;
   spray.particleSystem.startColor = paintColor;
   spray.particleSystem.Play();
   Invoke("Stage2", 1.0);
}

function Stage2()
{
   if (!containedUnit)
      return;

   containedUnit.SetActualColor(paintColor.r, paintColor.g, paintColor.b);
   spray.particleSystem.Stop();
   Invoke("Recover", 1.5);
}

function Recover()
{
   PostLaunch(containedUnit);
   numUnitsContained = 0;
}

function PostLaunch(unit : Unit)
{
   unit.LeapTo(walkStartPos.position);
   unit.SetPath(path);
}
