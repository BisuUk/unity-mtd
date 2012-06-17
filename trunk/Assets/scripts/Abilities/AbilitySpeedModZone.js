#pragma strict
#pragma downcast

var speedMod : float;
var isBuff : boolean;
var base : AbilityBase;

private var ID : int;
private var effect : Effect;
private var startTime : float;

private var unitsEffected : List.<Unit>;

function Awake()
{
   if (Network.isServer || Game.hostType == 0)
   {
      unitsEffected = new  List.<Unit>();
   }
}

function Start()
{
   if (Network.isServer || Game.hostType == 0)
   {
      ID = Utility.GetUniqueID();

      effect = new Effect();
      effect.type = Effect.Types.EFFECT_SPEED;
      effect.val = speedMod;
      effect.color = base.color;
      effect.interval = 0.0;
      effect.expireTime = 0.0;

      startTime = Time.time;
   }
}

function Update()
{
   // Check if it's time to die
   if (Time.time >= startTime+base.duration)
   {
      if (Game.hostType>0)
         Network.Destroy(gameObject);
      else
         Destroy(gameObject);
   }

   // Animate texture for that weird fx...
   var texOffset : Vector2 = Vector2(0, Time.time * 5.0);
   renderer.material.SetTextureOffset("_MainTex", texOffset);
}

function OnDestroy()
{
   // Remove buff from units we effected during our life
   if (Network.isServer || Game.hostType == 0)
   {
      for (var unit : Unit in unitsEffected)
      {
         // Unit could have died, so check for null
         if (unit)
         {
            // Remove effect if this area is about to be destroyed
            if (isBuff)
               unit.RemoveBuff(ID, Effect.Types.EFFECT_SPEED);
            else
               unit.RemoveDebuff(ID, Effect.Types.EFFECT_SPEED);
         }
      }
   }
}


function OnTriggerExit(other : Collider)
{
   // A unit stop colliding with us, remove buff
   if (Network.isServer || Game.hostType == 0)
   {
      var unitScr : Unit = other.gameObject.GetComponent(Unit);
      if (unitScr)
      {
         if (isBuff)
            unitScr.RemoveBuff(ID, Effect.Types.EFFECT_SPEED);
         else
            unitScr.RemoveDebuff(ID, Effect.Types.EFFECT_SPEED);
      }
      // Could do a lookup here and removed from unitsEffected.
      // Don't really see the point, ID doesn't ever repeat.
   }
}

function OnTriggerEnter(other : Collider)
{
   // A unit stop colliding with us, apply buff
   if (Network.isServer || Game.hostType == 0)
   {
      var unitScr : Unit = other.gameObject.GetComponent(Unit);
      if (unitScr)
      {
         if (isBuff)
            unitScr.ApplyBuff(ID, effect, false);
         else
            unitScr.ApplyDebuff(ID, effect, false);
         // Rememeber the unit we added our buff to, so when
         // this ability zone gets destroyed,  we'll remove
         // the buff from the unit. See OnDestroy().
         unitsEffected.Add(unitScr);
      }
   }
}

function MakeCursor(isCursor : boolean)
{
   enabled = !isCursor;
}