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
   if (tower.isConstructing==false)
   {
      // Server manages targeting behavior
      if (Network.isServer || GameData.hostType==0)
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
               if (GameData.hostType>0)
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
   lastBarrelFired = (lastBarrelFired==barrelLeft) ? barrelRight : barrelLeft;
   
   var pulse : Transform = Instantiate(laserPulsePrefab, transform.position, Quaternion.identity);
   var tpl : TowerPulseLaser = pulse.gameObject.GetComponent(TowerPulseLaser);
   tpl.muzzlePosition = lastBarrelFired.transform.position;
   tpl.targetPosition = targetLocation;
   tpl.laserColor = tower.color;

   lastBarrelFired.localPosition.z -= recoilDistance; // Recoil barrel

   nextFireTime = Time.time + tower.fireRate; // Set next time to fire

   if (Network.isServer || GameData.hostType==0)
   {
      // Apply damage to unit
      var targUnitScr : Unit = target.GetComponent(Unit);
      switch (tower.effect)
      {
         case 0:
            targUnitScr.ApplyDamage(tower.ID, tower.strength, tower.color);
            break;
         case 1:
            var e : Effect = new Effect();
            e.type = tower.effect;
            e.interval = 0.0;
            e.expireTime = Time.time + 1.0; // FIXME: Calc duration
            e.color = tower.color;
            e.val = tower.AdjustStrength(tower.strength, true);
            targUnitScr.ApplyDebuff(tower.ID, e);
            break;
      }
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

