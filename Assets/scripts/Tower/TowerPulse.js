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

   // Recoil barrel
   lastBarrelFired.localPosition.z -= recoilDistance;

   // Set next time to fire
   nextFireTime = Time.time + tower.fireRate;

   // Owner will apply damage to unit
   if (Network.isServer || GameData.hostType==0)
   {
      var tUnit : Unit = target.GetComponent(Unit);
      var rDmg : float = (0.3333 * (1.0 - Mathf.Abs(tower.color.r-tUnit.color.r)));
      var gDmg : float = (0.3333 * (1.0 - Mathf.Abs(tower.color.g-tUnit.color.g)));
      var bDmg : float = (0.3333 * (1.0 - Mathf.Abs(tower.color.b-tUnit.color.b)));
      //Debug.Log("TowerPulse:Fire: rDmg="+rDmg+" gDmg="+gDmg+" bDmg="+bDmg);
      var dmg : int = tower.strength * (rDmg + gDmg + bDmg);
   
      //if (tUnit.DoDamage(dmg, color) == false)
      tUnit.DoDamage(dmg, tower.color.r, tower.color.g, tower.color.b);
      //kills += 1;
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

