#pragma strict
#pragma downcast

var spinner : Transform;
var tower : Tower;
var dmgShotFXPrefab : Transform;
var slowShotFXPrefab : Transform;
var paintShotFXPrefab : Transform;
var netView : NetworkView;

private var nextFireTime : float;
private var targs : List.<GameObject>;


function Awake()
{
   targs = new List.<GameObject>();
}

function Update()
{
   if (!tower.isConstructing)
   {
      // Server manages targeting behavior
      if (Network.isServer || Game.hostType==0)
      {
         //  Fire if it's time
         if(Time.time >= nextFireTime)
         {
            tower.FindTargets(targs, false);
            if (targs.Count>0)
            {
               Fire();
               if (Game.hostType>0)
                  netView.RPC("Fire", RPCMode.Others);
            }
         }
      }

      // Spin the rings on a speed proportional to fire rate
      spinner.transform.Rotate(0.0,tower.AdjustFireRate(tower.fireRate, true)*1.0+1.0,0.0);
   }
}

@RPC
function Fire()
{
   // Set next time to fire
   nextFireTime = Time.time + tower.fireRate;

   var shotFX : Transform;
   var slowShotFXScr : TowerAOEShot;
   var dmgShotFXScr: TowerPulseLaser;

    // Server will apply damage to unit
   if (Network.isServer || Game.hostType==0)
   {
      for (var targ : GameObject in targs)
      {
         switch (tower.effect)
         {
         case 1:
            shotFX = Instantiate(slowShotFXPrefab, transform.position, Quaternion.identity);
            slowShotFXScr = shotFX.gameObject.GetComponent(TowerAOEShot);
            slowShotFXScr.muzzlePosition = transform.position;
            slowShotFXScr.targetPosition = targ.transform.position;
            slowShotFXScr.color = tower.color;
            slowShotFXScr.laserWidth = (tower.AdjustStrength(tower.strength, true)*2.0);
            if (slowShotFXScr.laserWidth < 0.2)
               slowShotFXScr.laserWidth = 0.2;
            break;

         case 2:
            shotFX = Instantiate(paintShotFXPrefab, transform.position, Quaternion.identity);
            dmgShotFXScr = shotFX.gameObject.GetComponent(TowerPulseLaser);
            dmgShotFXScr.muzzlePosition = transform.position;
            dmgShotFXScr.targetPosition = targ.transform.position;;
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
            dmgShotFXScr.muzzlePosition = transform.position;
            dmgShotFXScr.targetPosition = targ.transform.position;;
            dmgShotFXScr.laserColor = tower.color;
            dmgShotFXScr.laserWidthLimit.y = (tower.AdjustStrength(tower.strength, true)*2.5);
            dmgShotFXScr.laserWidthLimit.x = dmgShotFXScr.laserWidthLimit.y*0.45;
            if (dmgShotFXScr.laserWidthLimit.x <= 0)
               dmgShotFXScr.laserWidthLimit.x = 0.01;
            if (dmgShotFXScr.laserWidthLimit.y <= 0)
               dmgShotFXScr.laserWidthLimit.y = 0.3;
            break;
         }

         var targUnitScr : Unit = targ.GetComponent(Unit);
         switch (tower.effect)
         {
            // Apply damage to unit
            case Effect.Types.EFFECT_HEALTH:
               targUnitScr.ApplyDamage(tower.ID, tower.strength, tower.color);
               break;
   
            // Apply slow to unit
            case Effect.Types.EFFECT_SPEED:
               var e : Effect = new Effect();
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
         //kills += 1;
      }
   }
   else // Clients approximate targets for shot fx
   {
      tower.FindTargets(targs, false);

      for (var targ : GameObject in targs)
      {
         switch (tower.effect)
         {
         case 1:
            shotFX = Instantiate(slowShotFXPrefab, transform.position, Quaternion.identity);
            slowShotFXScr = shotFX.gameObject.GetComponent(TowerAOEShot);
            slowShotFXScr.muzzlePosition = transform.position;
            slowShotFXScr.targetPosition = targ.transform.position;
            slowShotFXScr.color = tower.color;
            slowShotFXScr.laserWidth = (tower.AdjustStrength(tower.strength, true)*2.0);
            if (slowShotFXScr.laserWidth < 0.2)
               slowShotFXScr.laserWidth = 0.2;
            break;

         case 2:
            shotFX = Instantiate(paintShotFXPrefab, transform.position, Quaternion.identity);
            dmgShotFXScr = shotFX.gameObject.GetComponent(TowerPulseLaser);
            dmgShotFXScr.muzzlePosition = transform.position;
            dmgShotFXScr.targetPosition = targ.transform.position;;
            dmgShotFXScr.laserColor = tower.color;
            dmgShotFXScr.laserWidthLimit.x = (tower.AdjustStrength(tower.strength, true)*2);
            if (dmgShotFXScr.laserWidthLimit.x <= 0.2)
               dmgShotFXScr.laserWidthLimit.x = 0.2;
            dmgShotFXScr.laserWidthLimit.y = 0.1;

         default:
            shotFX = Instantiate(dmgShotFXPrefab, transform.position, Quaternion.identity);
            dmgShotFXScr = shotFX.gameObject.GetComponent(TowerPulseLaser);
            dmgShotFXScr.muzzlePosition = transform.position;
            dmgShotFXScr.targetPosition = targ.transform.position;;
            dmgShotFXScr.laserColor = tower.color;
            dmgShotFXScr.laserWidthLimit.y = (tower.AdjustStrength(tower.strength, true)*2.5);
            dmgShotFXScr.laserWidthLimit.x = dmgShotFXScr.laserWidthLimit.y*0.45;
            if (dmgShotFXScr.laserWidthLimit.x <= 0)
               dmgShotFXScr.laserWidthLimit.x = 0.01;
            if (dmgShotFXScr.laserWidthLimit.y <= 0)
               dmgShotFXScr.laserWidthLimit.y = 0.3;
            break;
         }
      }
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}


