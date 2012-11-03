#pragma strict

var leftCan : Transform;
var rightCan : Transform;
var mixTween : iTweenEvent;

private var leftUnit : Unit;
private var rightUnit : Unit;

private var numUnitsContained : int;

function Start ()
{

}

function Update ()
{
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


         unit.SetPosition((numUnitsContained == 1) ? leftCan.position : rightCan.position);
         unit.transform.parent = (numUnitsContained == 1) ? leftCan : rightCan;
         numUnitsContained += 1;
         if (numUnitsContained == 2)
            Mix();
      }




   }
}


function Mix()
{
   mixTween.Play();
   Invoke("Combine", 1.5);
   Invoke("Recover", 3.0);
   Debug.Log("Firing!");
}

function Combine()
{
   if (leftUnit)
      leftUnit.Kill();
   if (rightUnit)
      rightUnit.Kill();
/*
   var newUnit : GameObject;
   var launchStart : Vector3 = leapPosition.position;
   var squadID : int = Utility.GetUniqueID();
   // Start launch countdown
   //SetLaunchDuration(duration);

   // Spawn combined unit
   var unitAttr : UnitAttributes = launchQueue[0];
   var prefabName : String = Unit.PrefabName(unitAttr.unitType);

   if (Network.isServer)
      newUnit = Network.Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity, 0);
   else
      newUnit = Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity);

   //unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, speed);
   //unitAttr.speed = (launchSlowly) ? launchSpeedLimits.x : launchSpeedLimits.y;
   unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, launchSpeed);

   var newUnitScr : Unit = newUnit.GetComponent(Unit);
   newUnitScr.ID = Utility.GetUniqueID();
   //newUnitScr.emitter = this;
   newUnitScr.SetPath(path);
   newUnitScr.SetAttributes(unitAttr);
   // Send attributes to client so it can calculate FX like radii etc.
   if (Network.isServer)
   {
      newUnitScr.netView.RPC("ClientSetAttributes", RPCMode.Others,
         unitAttr.unitType, unitAttr.size, unitAttr.speed, unitAttr.strength,
         unitAttr.color.r, unitAttr.color.g, unitAttr.color.b, netView.viewID);
   }
*/

}

function Recover()
{
   numUnitsContained = 0;
}