#pragma strict
#pragma downcast

var muzzlePosition : Transform;
var tower : Tower;
var paintShotFXPrefab : Transform;
var netView : NetworkView;

private var nextFireTime : float;


function Update()
{
   if (!tower.isConstructing)
   {
      // Server manages targeting behavior
      if (!Network.isClient)
      {
         //  Fire if it's time
         if(Time.time >= nextFireTime)
         {
            if (tower.targets.Count>0)
            {
               Fire();
               if (Network.isServer)
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
   if (!Network.isClient)
   {
      for (var unit : Unit in tower.targets)
      {
         if (unit && unit.isAttackable)
         {
            SpawnShotFX(unit.transform.position);
            if (Network.isServer)
               netView.RPC("SpawnShotFX", RPCMode.Others, unit.transform.position);

            var e : Effect = new Effect();
            e.type = ActionType.ACTION_COLOR_CHANGE;
            e.val = Mathf.Lerp(0.1, 1.0, tower.AdjustStrength(tower.strength, true));
            e.color = tower.color;
            e.interval = 0.1;
            e.expireTime = Time.time; // 1-shot, remove immediately
            unit.ApplyDebuff(tower.ID, e, true);
         }
      }
   }
}

@RPC
function SpawnShotFX(targetPosition : Vector3)
{
   var shotFX : Transform;
   var shotFXScr : LaserBeamFX;

   shotFX = Instantiate(paintShotFXPrefab, transform.position, Quaternion.identity);
   shotFXScr = shotFX.gameObject.GetComponent(LaserBeamFX);
   shotFXScr.startPosition = muzzlePosition;
   shotFXScr.endPosition = targetPosition;
   shotFXScr.laserColor = tower.color;
   shotFXScr.laserWidthLimit.x = 0.1;
   shotFXScr.laserWidthLimit.y = 0.5+(tower.AdjustStrength(tower.strength, true));
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}


