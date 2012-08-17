#pragma strict
#pragma downcast

var muzzlePosition : Transform;
var dmgShotFXPrefab : Transform;
var slowShotFXPrefab : Transform;
var paintShotFXPrefab : Transform;
var tower : Tower;
var animIdletoFireTime : float;
var animFiretoIdleTime : float;
var turnSpeed : float;
var netView : NetworkView;
private var target : GameObject;
private var laserPulse : Transform;
private var nextFireTime : float;
private var animationState : int;


function Update()
{
   if (!tower.isConstructing)
   {
      // Server manages targeting behavior
      if (Network.isServer || Game.hostType==0)
      {
         var targ : GameObject = tower.FindSingleTarget(false);
         if (targ)
         {
            transform.rotation = Quaternion.Slerp(
               transform.rotation,
               Quaternion.LookRotation(targ.transform.position-transform.position),
               Time.deltaTime * turnSpeed);
            //transform.LookAt(targ.transform);
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

      if (tower.character)
      {
         switch (animationState)
         {
            case 0: tower.character.animation.CrossFade("idleRW", animFiretoIdleTime); break;
            case 1: tower.character.animation.CrossFade("fireRW", animIdletoFireTime); break;
         }
      }
   }
}

@RPC
function Fire(targetLocation : Vector3)
{
   // Blend animation
   animationState = 1;
   //if (tower.character)
   //   tower.character.animation.CrossFade("fireRW");

   // Set next time to fire
   nextFireTime = Time.time + tower.fireRate + tower.base.windupTime;

   yield WaitForSeconds(tower.base.windupTime);

   SpawnShotFX(targetLocation);

   // Check it target is still alive
   if (!Network.isClient && target)
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

   animationState = 0;
   //if (tower.character)
      //tower.character.animation.CrossFade("idleRW", 2.0);
}

function SpawnShotFX(targetLocation : Vector3)
{
   var shotFX : Transform;
   var slowShotFXScr : LightningBoltFX;
   var dmgShotFXScr : LaserBeamFX;
   var lightningFX : LightningBoltFX;

   switch (tower.effect)
   {
   case 1: // SLOW
      shotFX = Instantiate(slowShotFXPrefab, transform.position, Quaternion.identity);
      slowShotFXScr = shotFX.gameObject.GetComponent(LightningBoltFX);
      //slowShotFXScr.muzzlePosition = lastBarrelFired.transform.position;
      slowShotFXScr.startPosition = muzzlePosition;
      slowShotFXScr.endPosition.position = targetLocation;
      slowShotFXScr.color = tower.color;
      slowShotFXScr.lineWidth = (tower.AdjustStrength(tower.strength, true)*2.0);
      if (slowShotFXScr.lineWidth < 0.2)
         slowShotFXScr.lineWidth = 0.2;
      break;

   case 2: // PAINT
      shotFX = Instantiate(paintShotFXPrefab, transform.position, Quaternion.identity);
      dmgShotFXScr = shotFX.gameObject.GetComponent(LaserBeamFX);
      //dmgShotFXScr.muzzlePosition = lastBarrelFired.transform.position;
      dmgShotFXScr.startPosition = muzzlePosition;
      dmgShotFXScr.endPosition = targetLocation;
      dmgShotFXScr.laserColor = tower.color;
      dmgShotFXScr.laserWidthLimit.x = 0.1;
      dmgShotFXScr.laserWidthLimit.y = 0.5+(tower.AdjustStrength(tower.strength, true));
      break;

   default: // DAMAGE
      shotFX = Instantiate(dmgShotFXPrefab, targetLocation, Quaternion.identity);
      lightningFX = shotFX.gameObject.GetComponent(LightningBoltFX);
      lightningFX.endPosition = muzzlePosition;
/*
      //dmgShotFXScr = shotFX.gameObject.GetComponent(LaserBeamFX);
      //dmgShotFXScr.muzzlePosition = lastBarrelFired.transform.position;
      //dmgShotFXScr.startPosition = muzzlePosition;
      dmgShotFXScr.endPosition = targetLocation;
      dmgShotFXScr.laserColor = tower.color;
      dmgShotFXScr.laserWidthLimit.x = (tower.AdjustStrength(tower.strength, true)*5.0);
      dmgShotFXScr.laserWidthLimit.y = dmgShotFXScr.laserWidthLimit.x*0.35;
      if (dmgShotFXScr.laserWidthLimit.x <= 0)
         dmgShotFXScr.laserWidthLimit.x = 0.3;
      if (dmgShotFXScr.laserWidthLimit.y <= 0)
         dmgShotFXScr.laserWidthLimit.y = 0.01;
      break;
*/
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

