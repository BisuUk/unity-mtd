#pragma strict
#pragma downcast

var spinner : Transform;
var tower : Tower;
var shotFXPrefab : Transform;
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
      spinner.transform.Rotate(0.0,tower.AdjustFireRate(tower.fireRate, true)*2.0+1.0,0.0);
   }
}

@RPC
function Fire()
{
   // Set next time to fire
   nextFireTime = Time.time + tower.fireRate;

   var shotFX : Transform;
   var shotFXScr : TowerAOEShot;

   // Server will apply damage to unit
   if (Network.isServer || Game.hostType==0)
   {
      for (var targ : GameObject in targs)
      {
         shotFX = Instantiate(shotFXPrefab, transform.position, Quaternion.identity);
         shotFXScr = shotFX.gameObject.GetComponent(TowerAOEShot);
         shotFXScr.muzzlePosition = transform.position;
         shotFXScr.targetPosition = targ.transform.position;
         shotFXScr.color = tower.color;

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
         //kills += 1;
      }
   }
   else // Clients approximate targets for shot fx
   {
      tower.FindTargets(targs, false);

      for (var targ : GameObject in targs)
      {
         shotFX = Instantiate(shotFXPrefab, transform.position, Quaternion.identity);
         shotFXScr = shotFX.gameObject.GetComponent(TowerAOEShot);
         shotFXScr.muzzlePosition = transform.position;
         shotFXScr.targetPosition = targ.transform.position;
         shotFXScr.color = tower.color;
      }
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}


