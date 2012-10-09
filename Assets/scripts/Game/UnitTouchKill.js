#pragma strict

function OnTriggerEnter(other : Collider)
{
   if (!Network.isClient)
   {
      var unit : Unit = other.GetComponent(Unit);
      if (unit)
         unit.Kill();
   }
}