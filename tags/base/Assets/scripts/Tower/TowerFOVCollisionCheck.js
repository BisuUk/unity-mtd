#pragma strict

var tower : Tower;

function OnTriggerEnter(other : Collider)
{
   // A unit stop colliding with us, apply buff
   if (Network.isServer || Game.hostType == 0)
   {
      var unit : Unit = other.gameObject.GetComponent(Unit);
      if (unit)
      {
         tower.AddTarget(unit);
         //Debug.Log("OnTriggerEnter: unit id="+unit.ID);
      }
   }
}

function OnTriggerExit(other : Collider)
{
   // A unit stop colliding with us, apply buff
   if (Network.isServer || Game.hostType == 0)
   {
      var unit : Unit = other.gameObject.GetComponent(Unit);
      if (unit)
      {
         tower.RemoveTarget(unit);
         //Debug.Log("OnTriggerExit: unit id="+unit.ID);
      }
   }
}