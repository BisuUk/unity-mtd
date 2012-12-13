#pragma strict

var monster : Monster;

function OnTriggerEnter(other : Collider)
{
   // A unit stop colliding with us, apply buff
   if (!Network.isClient)
   {
      var unit : Unit = other.gameObject.GetComponent(Unit);
      if (unit)
      {
         monster.AddTarget(unit);
         //Debug.Log("OnTriggerEnter: unit id="+unit.ID);
      }
   }
}

function OnTriggerExit(other : Collider)
{
   // A unit stop colliding with us, apply buff
   if (!Network.isClient)
   {
      var unit : Unit = other.gameObject.GetComponent(Unit);
      if (unit)
      {
         monster.RemoveTarget(unit);
         //Debug.Log("OnTriggerExit: unit id="+unit.ID);
      }
   }
}