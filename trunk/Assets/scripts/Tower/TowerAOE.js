#pragma strict
#pragma downcast

var muzzlePosition : Transform;
var tower : Tower;
var dmgShotFXPrefab : Transform;
var slowShotFXPrefab : Transform;
var paintShotFXPrefab : Transform;
//var spinner : Transform;
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
            if (tower.targets.Count>0)
            {
               Fire();
               if (Game.hostType>0)
                  netView.RPC("Fire", RPCMode.Others);
            }
         }
      }
      // Spin the rings on a speed proportional to fire rate
      //spinner.transform.Rotate(0.0,tower.AdjustFireRate(tower.fireRate, true)*1.0+1.0,0.0);
   }
}

@RPC
function Fire()
{
   // Set next time to fire
   nextFireTime = Time.time + tower.fireRate;

    // Server will apply damage to unit
   if (Network.isServer || Game.hostType==0)
   {
      for (var unit : Unit in tower.targets)
      {
         if (unit && unit.isAttackable)
         {
            SpawnShotFX(unit.transform.position);
            if (Network.isServer)
               netView.RPC("SpawnShotFX", RPCMode.Others, unit.transform.position);

            switch (tower.effect)
            {
               // Apply damage to unit
               case Effect.Types.EFFECT_HEALTH:
                  unit.ApplyDamage(tower.ID, tower.strength, tower.color);
                  break;
      
               // Apply slow to unit
               case Effect.Types.EFFECT_SPEED:
                  var e : Effect = new Effect();
                  e.type = tower.effect;
                  e.val = Mathf.Lerp(0.1, 1.0, tower.AdjustStrength(tower.strength, true));
                  e.color = tower.color;
                  e.interval = 0.0;    // applied every frame
                  e.expireTime = Time.time + 1.0; // FIXME: Calc duration
                  unit.ApplyDebuff(tower.ID, e, true);
                  break;
   
               // Apply discolor to unit
               case Effect.Types.EFFECT_COLOR:
                  e = new Effect();
                  e.type = tower.effect;
                  e.val = Mathf.Lerp(0.1, 1.0, tower.AdjustStrength(tower.strength, true));
                  e.color = tower.color;
                  e.interval = 0.1;
                  e.expireTime = Time.time; // 1-shot, remove immediately
                  unit.ApplyDebuff(tower.ID, e, true);
                  break;
            }
         }
      }
   }
}

@RPC
function SpawnShotFX(targetPosition : Vector3)
{
   var shotFX : Transform;
   var slowShotFXScr : LightningBoltFX;
   var dmgShotFXScr: LaserBeamFX;

   switch (tower.effect)
   {
   case 1: // SLOW
      shotFX = Instantiate(slowShotFXPrefab, transform.position, Quaternion.identity);
      slowShotFXScr = shotFX.gameObject.GetComponent(LightningBoltFX);
      slowShotFXScr.startPosition = muzzlePosition;
      slowShotFXScr.endPosition.position = targetPosition;
      slowShotFXScr.color = tower.color;
      slowShotFXScr.lineWidth = (tower.AdjustStrength(tower.strength, true)*2.0);
      if (slowShotFXScr.lineWidth < 0.2)
         slowShotFXScr.lineWidth = 0.2;
      break;

   case 2: // PAINT
      shotFX = Instantiate(paintShotFXPrefab, transform.position, Quaternion.identity);
      dmgShotFXScr = shotFX.gameObject.GetComponent(LaserBeamFX);
      dmgShotFXScr.startPosition = muzzlePosition;
      dmgShotFXScr.endPosition = targetPosition;
      dmgShotFXScr.laserColor = tower.color;
      dmgShotFXScr.laserWidthLimit.x = 0.1;
      dmgShotFXScr.laserWidthLimit.y = 0.5+(tower.AdjustStrength(tower.strength, true));

   default: // DAMAGE
      shotFX = Instantiate(dmgShotFXPrefab, transform.position, Quaternion.identity);
      dmgShotFXScr = shotFX.gameObject.GetComponent(LaserBeamFX);
      dmgShotFXScr.startPosition = muzzlePosition;
      dmgShotFXScr.endPosition = targetPosition;
      dmgShotFXScr.laserColor = tower.color;
      dmgShotFXScr.laserWidthLimit.x = (tower.AdjustStrength(tower.strength, true)*2.0);
      dmgShotFXScr.laserWidthLimit.y = dmgShotFXScr.laserWidthLimit.x*0.45;
      if (dmgShotFXScr.laserWidthLimit.x <= 0)
         dmgShotFXScr.laserWidthLimit.x = 0.3;
      if (dmgShotFXScr.laserWidthLimit.y <= 0)
         dmgShotFXScr.laserWidthLimit.y = 0.01;
      break;
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}


