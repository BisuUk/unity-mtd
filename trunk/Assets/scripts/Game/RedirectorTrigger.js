#pragma strict

var redirector : Redirector;

function OnTriggerEnter(other : Collider)
{
   if (!Network.isClient)
   {
      var unit : Unit = other.GetComponent(Unit);
      if (unit)
         redirector.Redirect(unit);
   }
}