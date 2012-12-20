#pragma strict
#pragma downcast

var range : float;
var effect : ActionType;
var magnitude : float;
var duration : float;
var color : Color;
var maxTargets : int;
var spawnFX : Transform;

function Spawn()
{
   SpawnFX();

   var objectArray : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");
   // Order by distance position
   var objectList : List.<GameObject> = objectArray.OrderBy(function(x){return (x.transform.position-transform.position).magnitude;}).ToList();

   var unitCount : int = 0;
   for (var obj : GameObject in objectList)
   {
      if (unitCount >= maxTargets)
         break;

      var affect : boolean = true;
      if (range > 0.0) // < 0 == infinite range
         affect = (obj.transform.position-transform.position).magnitude <= range;

      if (affect)
      {
         var unit : Unit = obj.GetComponent(Unit);
         if (unit && unit.isAttackable)
         {
            var e : Effect = new Effect();
            e.type = effect;
            e.val = magnitude;
            e.color = unit.actualColor;

            unitCount += 1;
            switch (effect)
            {
               case ActionType.ACTION_STOPGO:
                  unit.SetWalking(!unit.isWalking);
               break;

               case ActionType.ACTION_SPEED_CHANGE:
                  if (!unit.isWalking)
                     unit.SetWalking(true);
                  e.interval = 0.0;
                  e.expireTime = Time.time+duration;
                  if (magnitude < 1.0)
                     unit.ApplyDebuff(effect, e, true);
                  else
                     unit.ApplyBuff(effect, e, true);
               break;

               case ActionType.ACTION_REVERSE:
                  if (unit.isWalking)
                     unit.ReversePath();
               break;

               case ActionType.ACTION_SPLAT:
                  unit.Splat(false);
                  unit.Remove();
               break;

               default:
               break;
            }

            Game.control.OnUseAbility();
         }
      }
   }

   Destroy(gameObject, 0.1);
}

function Start()
{
   if (Network.isClient)
      SpawnFX();
   else
      Spawn();
}

function SpawnFX()
{
   if (spawnFX)
   {
      if (Network.isServer)
         Network.Instantiate(spawnFX, transform.position, Quaternion.identity, 0);
      else
         Instantiate(spawnFX, transform.position, Quaternion.identity);
   }
}