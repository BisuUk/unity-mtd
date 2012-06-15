#pragma strict
#pragma downcast

var recoilDistance : float;
var recoilRecoverSpeed : float;
var barrelLeft : Transform;
var barrelRight : Transform;
var dmgShotFXPrefab : Transform;
var slowShotFXPrefab : Transform;
var paintShotFXPrefab : Transform;
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

   var shotFX : Transform;
   var slowShotFXScr : TowerAOEShot;
   var dmgShotFXScr: TowerPulseLaser;

   switch (tower.effect)
   {
   case 1:
      shotFX = Instantiate(slowShotFXPrefab, transform.position, Quaternion.identity);
      slowShotFXScr = shotFX.gameObject.GetComponent(TowerAOEShot);
      slowShotFXScr.muzzlePosition = lastBarrelFired.transform.position;
      slowShotFXScr.targetPosition = target.transform.position;
      slowShotFXScr.color = tower.color;
      slowShotFXScr.laserWidth = (tower.AdjustStrength(tower.strength, true)*2.0);
      if (slowShotFXScr.laserWidth < 0.2)
         slowShotFXScr.laserWidth = 0.2;
      break;

   case 2:
      shotFX = Instantiate(paintShotFXPrefab, transform.position, Quaternion.identity);
      dmgShotFXScr = shotFX.gameObject.GetComponent(TowerPulseLaser);
      dmgShotFXScr.muzzlePosition = lastBarrelFired.transform.position;
      dmgShotFXScr.targetPosition = target.transform.position;;
      dmgShotFXScr.laserColor = tower.color;
      dmgShotFXScr.laserWidthLimit.x = (tower.AdjustStrength(tower.strength, true)*2);
      if (dmgShotFXScr.laserWidthLimit.x <= 0.2)
         dmgShotFXScr.laserWidthLimit.x = 0.2;
      dmgShotFXScr.laserWidthLimit.y = 0.1;
      break;

   default:
      // Spawn laser effect
      shotFX = Instantiate(dmgShotFXPrefab, transform.position, Quaternion.identity);
      dmgShotFXScr = shotFX.gameObject.GetComponent(TowerPulseLaser);
      dmgShotFXScr.muzzlePosition = lastBarrelFired.transform.position;
      dmgShotFXScr.targetPosition = target.transform.position;;
      dmgShotFXScr.laserColor = tower.color;
      dmgShotFXScr.laserWidthLimit.y = (tower.AdjustStrength(tower.strength, true)*3.0);
      dmgShotFXScr.laserWidthLimit.x = dmgShotFXScr.laserWidthLimit.y*0.45;
      if (dmgShotFXScr.laserWidthLimit.x <= 0)
         dmgShotFXScr.laserWidthLimit.x = 0.01;
      if (dmgShotFXScr.laserWidthLimit.y <= 0)
         dmgShotFXScr.laserWidthLimit.y = 0.3;
      break;
   }


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
            e.val = Mathf.Lerp(0.1, 1.0, tower.AdjustStrength(tower.strength, true));
            e.color = tower.color;
            e.interval = 0.0;    // applied every frame
            e.expireTime = Time.time + 1.0; // FIXME: Calc duration
            targUnitScr.ApplyDebuff(tower.ID, e, true);
            break;

         // Apply discolor to unit
         case Effect.Types.EFFECT_COLOR:
            e = new Effect();
            e.type = tower.effect;
            e.val = Mathf.Lerp(0.1, 1.0, tower.AdjustStrength(tower.strength, true));
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

