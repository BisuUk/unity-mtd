#pragma strict
#pragma downcast

var magnitude : float;
var base : AbilityBase;

private var ID : int;
private var startTime : float;

function Start()
{
   if (Network.isServer || Game.hostType == 0)
   {
      ID = Utility.GetUniqueID();
   }
   startTime = Time.time;
}

function Update()
{
   if (Network.isServer || Game.hostType == 0)
   {
      // Check if it's time to die
      if (Time.time >= startTime+base.duration)
      {
         if (Game.hostType>0)
            Network.Destroy(gameObject);
         else
            Destroy(gameObject);
      }
   }
   var c : Color = base.color;
   c.a = Mathf.Lerp(base.color.a, 0, ((Time.time-startTime)/base.duration));
   base.SetChildrenColor(transform, c);
}

function OnTriggerEnter(other : Collider)
{
   var effect : Effect = new Effect();
   effect = new Effect();
   effect.type = Effect.Types.EFFECT_COLOR;
   effect.val = magnitude;
   effect.color = base.color;
   effect.interval = 0.1;
   effect.expireTime = 0.2;

   // A unit stop colliding with us, apply buff
   if (Network.isServer || Game.hostType == 0)
   {
      var unitScr : Unit = other.gameObject.GetComponent(Unit);
      if (unitScr)
         unitScr.ApplyBuff(ID, effect, true);
   }
}

function OnTriggerStay(other : Collider)
{
   var effect : Effect = new Effect();
   effect.type = Effect.Types.EFFECT_COLOR;
   effect.val = magnitude;
   effect.color = base.color;
   effect.interval = 0.1;
   effect.expireTime = 0.2;

   // A unit stop colliding with us, apply buff
   if (Network.isServer || Game.hostType == 0)
   {
      var unitScr : Unit = other.gameObject.GetComponent(Unit);
      if (unitScr)
         unitScr.ApplyBuff(ID, effect, true);
   }
}

function MakeCursor(isCursor : boolean)
{
   enabled = !isCursor;
}