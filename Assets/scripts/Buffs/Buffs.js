#pragma strict

class BuffSpeed extends Buff
{
   var speedInc : float = 1.25f;

   function BuffSpeed()
   {
      this.duration = 2.0f;
   }

   function OnStart()
   {
      var u : UnitSimple = t.GetComponent(UnitSimple);
      if (u)
         u.actualSpeed += speedInc;
   }

   function OnRemove()
   {
      OnExpire();
   }

   function OnExpire()
   {
      var u : UnitSimple = t.GetComponent(UnitSimple);
      if (u)
         u.actualSpeed -= speedInc;
   }
}
