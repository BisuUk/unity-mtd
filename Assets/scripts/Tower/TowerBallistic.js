#pragma strict
#pragma downcast

var projectileTimeToImpact : float;
var projectileArcHeight : float;
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
      // If there's one attackable unit in there, fire.
      if (tower.targets.Count > 0)
      {
         SpawnShotFX(tower.FOV.transform.position);
         if (Network.isServer)
            netView.RPC("SpawnShotFX", RPCMode.Others, tower.FOV.transform.position);

         Invoke("DoDamage", projectileTimeToImpact);
      }
   }
}

function DoDamage()
{
   for (var unit : Unit in tower.targets)
   {
      if (unit && unit.isAttackable)
      {
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

@RPC
function SpawnShotFX(targetPositon : Vector3)
{
   var shotFX : Transform;
   //var slowShotFXScr : TowerShotLightning;
   var dmgShotFXScr: TowerBallisticProjectile;


   switch (tower.effect)
   {
   //case 1: // SLOW
   //
   //case 2: // PAINT
   // break;

   default: // DAMAGE
      shotFX = Instantiate(dmgShotFXPrefab, transform.position, Quaternion.identity);
      dmgShotFXScr = shotFX.GetComponent(TowerBallisticProjectile);
      shotFX.transform.position = muzzlePosition.position;

      dmgShotFXScr.targetPos = tower.FOV.transform.position;
      dmgShotFXScr.timeToImpact = projectileTimeToImpact;
      dmgShotFXScr.arcHeight = projectileArcHeight;
      dmgShotFXScr.SetColor(tower.color);

      dmgShotFXScr.Fire();
      break;
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}


