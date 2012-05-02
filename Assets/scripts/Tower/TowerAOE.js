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
   if (tower.isConstructing==false)
   {
      // Server manages targeting behavior
      if (Network.isServer || GameData.hostType==0)
      {
         //  Fire if it's time
         if(Time.time >= nextFireTime)
         {
            tower.FindTargets(targs, false);
            if (targs.Count>0)
            {
               Fire();
               if (GameData.hostType>0)
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

   // Owner will apply damage to unit
   if (Network.isServer || GameData.hostType==0)
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


