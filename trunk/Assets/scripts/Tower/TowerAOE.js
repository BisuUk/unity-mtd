#pragma strict
#pragma downcast

//var recoilDistance : float;
//var recoilRecoverSpeed : float;
var spinner : Transform;
var tower : Tower;
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

      spinner.transform.Rotate(0.0,1.0,0.0);
   }
}


@RPC
function Fire()
{
   // Set next time to fire
   nextFireTime = Time.time + tower.fireRate;

   // Owner will apply damage to unit
   if (Network.isServer || GameData.hostType==0)
   {
      Debug.Log("FIRING!");
      for (var targ : GameObject in targs)
      {
         var tUnit : Unit = targ.GetComponent(Unit);
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
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

