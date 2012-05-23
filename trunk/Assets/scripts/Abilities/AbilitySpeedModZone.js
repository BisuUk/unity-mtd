#pragma strict
#pragma downcast

var speedMod : float;
var isBuff : boolean;
var base : AbilityBase;

private var ID : int;
private var effect : Effect;
private var startTime : float;

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
   renderer.enabled = true;

   if (Network.isServer || Game.hostType == 0)
   {
      // Find all game objects with tag
      var objs : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
      var goingToDestroy : boolean = false;

      if (Time.time >= startTime+base.duration)
         goingToDestroy = true;

      // Iterate through them and find the closest one
      for (var obj : GameObject in objs)
      {
         var unitScr : Unit = obj.GetComponent(Unit);

         if (goingToDestroy)
         {
            // Remove effect if this area is about to be destroyed
            if (isBuff)
               unitScr.RemoveBuff(ID, Effect.Types.EFFECT_SPEED);
            else
               unitScr.RemoveDebuff(ID, Effect.Types.EFFECT_SPEED);
         }
         else if (unitScr.isAttackable && unitScr.health > 0 && unitScr.unpauseTime == 0.0)
         {
            if (renderer.bounds.Contains(obj.transform.position))
            {
               if (isBuff)
                  unitScr.ApplyBuff(ID, effect, false);
               else
                  unitScr.ApplyDebuff(ID, effect, false);
            }
            else
            {
               if (isBuff)
                  unitScr.RemoveBuff(ID, Effect.Types.EFFECT_SPEED);
               else
                  unitScr.RemoveDebuff(ID, Effect.Types.EFFECT_SPEED);
            }
         }
      }

      if (goingToDestroy)
      {
         if (Game.hostType>0)
            Network.Destroy(gameObject);
         else
            Destroy(gameObject);
      }
   }

   // Animate texture for that weird fx...
   var texOffset : Vector2 = Vector2(0, Time.time * 5.0);
   renderer.material.SetTextureOffset("_MainTex", texOffset);
}


function MakeCursor(isCursor : boolean)
{
   enabled = !isCursor;
}
