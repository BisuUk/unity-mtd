#pragma strict
#pragma downcast

var unit : Unit;
var speedDurationLimits : Vector2;
var speedBoostLimits : Vector2;


@RPC
function Fire()
{
   if (unit)
   {
      var effect : Effect = new Effect();
      effect.type = Effect.Types.EFFECT_SPEED;
      effect.val = Mathf.Lerp(speedBoostLimits.x, speedBoostLimits.y, unit.strength);
      effect.color = unit.actualColor;
      effect.interval = 0.0;
      effect.expireTime = Time.time+(Mathf.Lerp(speedDurationLimits.x, speedDurationLimits.y, unit.strength));
      unit.ApplyBuff(unit.ID, effect, true);

      if (Network.isServer)
         unit.netView.RPC("Fire", RPCMode.Others);

   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}


function OnAbility1()
{
   if (unit)
   {
      if (Network.isClient)
         unit.netView.RPC("Fire", RPCMode.Server);
      else
         Fire();
   }
}