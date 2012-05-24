#pragma strict
#pragma downcast

var recoilDistance : float;
var recoilRecoverSpeed : float;
var barrelLeft : Transform;
var barrelRight : Transform;
var laserPulsePrefab : Transform;
var tower : Tower;
var netView : NetworkView;
private var target : GameObject;
private var laserPulse : Transform;
private var nextFireTime : float;
private var lastBarrelFired : Transform;
private var origBarrelOffset : float;


function Awake()
{
   lastBarrelFired = barrelRight;
   origBarrelOffset = lastBarrelFired.localPosition.z;
}

function Update()
{
   if (!tower.isConstructing)
   {
      // Server manages targeting behavior
      if (Network.isServer || Game.hostType==0)
      {
         var targ : GameObject = tower.FindTarget(false);
         if (targ)
         {
            transform.LookAt(targ.transform);
            target = targ;
   
            //  Fire if it's time
            if(Time.time >= nextFireTime)
            {
               Fire(target.transform.position);
               if (Game.hostType>0)
                  netView.RPC("Fire", RPCMode.Others, target.transform.position);
            }
         }
      }

      // Move gun barrels back into place from recoil
      if (lastBarrelFired.localPosition.z < origBarrelOffset)
         lastBarrelFired.localPosition.z += recoilRecoverSpeed;
      else if (lastBarrelFired.localPosition.z > origBarrelOffset)
         lastBarrelFired.localPosition.z = origBarrelOffset;
   }
}

@RPC
function Fire(targetLocation : Vector3)
{
   // Manage gun barrel
   lastBarrelFired = (lastBarrelFired==barrelLeft) ? barrelRight : barrelLeft;
   lastBarrelFired.localPosition.z -= recoilDistance; // Recoil

   // Spawn laser effect
   var pulse : Transform = Instantiate(laserPulsePrefab, transform.position, Quaternion.identity);
   var tpl : TowerPulseLaser = pulse.gameObject.GetComponent(TowerPulseLaser);
   tpl.muzzlePosition = lastBarrelFired.transform.position;
   tpl.targetPosition = targetLocation;
   tpl.laserColor = tower.color;
   tpl.laserWidthLimit.y = 0.15 + tower.AdjustStrength(tower.strength, true);

   // Set next time to fire
   nextFireTime = Time.time + tower.fireRate;

   if (Network.isServer || Game.hostType==0)
   {
      var targUnitScr : Unit = target.GetComponent(Unit);
      var e : Effect;
      switch (tower.effect)
      {
         // Apply damage to unit
         case Effect.Types.EFFECT_HEALTH:
            targUnitScr.ApplyDamage(tower.ID, tower.strength, tower.color);
            break;

         // Apply slow to unit
         case Effect.Types.EFFECT_SPEED:
            e = new Effect();
            e.type = tower.effect;
            e.val = tower.AdjustStrength(tower.strength, true);
            e.color = tower.color;
            e.interval = 0.0;    // applied every frame
            e.expireTime = Time.time + 1.0; // FIXME: Calc duration
            targUnitScr.ApplyDebuff(tower.ID, e, true);
            break;

         // Apply discolor to unit
         case Effect.Types.EFFECT_COLOR:
            e = new Effect();
            e.type = tower.effect;
            e.val = tower.AdjustStrength(tower.strength, true);
            e.color = tower.color;
            e.interval = 0.1;
            e.expireTime = Time.time; // 1-shot, remove immediately
            targUnitScr.ApplyDebuff(tower.ID, e, true);
            break;
      }
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

