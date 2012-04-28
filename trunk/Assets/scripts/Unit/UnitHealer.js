#pragma strict

var unit : Unit;
var fireRate : float;
var radius : float;
var netView : NetworkView;

private var targs : List.<GameObject>;
private var nextFireTime : float;

static private var healFXPrefab : Transform;

function Awake()
{
   nextFireTime = 0.0;
   targs = new List.<GameObject>();
   if (healFXPrefab == null)
      healFXPrefab = Resources.Load("prefabs/fx/UnitHealPrefab", Transform);
}

function Update ()
{
   // Server manages targeting behavior
   if (Network.isServer || GameData.hostType==0)
   {
      //  Fire if it's time
      if(Time.time >= nextFireTime)
      {
         unit.FindTargets(targs, radius, false);
         if (targs.Count>0)
         {
            var healedSomething : boolean = Fire();
            if (GameData.hostType>0 && healedSomething)
               netView.RPC("Fire", RPCMode.Others);
         }
      }
   }
}

@RPC
function Fire() : boolean
{
   // Set next time to fire
   nextFireTime = Time.time + fireRate;
   var showHealFX : boolean = false;

   var shotFX : Transform;
   var shotFXParticle : ParticleSystem;

   if (Network.isServer || GameData.hostType==0)
   {
      for (var targ : GameObject in targs)
      {
         var targUnit : Unit = targ.GetComponent(Unit);
         // 0.20 == 20%+5% = 25% max | 5% min
         var healthBoost : float = (unit.strength*0.20) * parseFloat(targUnit.maxHealth) + (parseFloat(targUnit.maxHealth)*0.05);
         healthBoost *= Utility.ColorMatch(unit.color, targUnit.color);
         if (targUnit.ApplyHealing(Mathf.CeilToInt(healthBoost), unit.color))
            showHealFX = true;
      }

      // If we did heal someone for some value, show particle effect
      if (showHealFX)
      {
         shotFX = Instantiate(healFXPrefab, transform.position, Quaternion.identity);
         shotFX.Rotate(270.0,0.0,0.0);
         shotFXParticle = shotFX.GetComponent(ParticleSystem);
         shotFXParticle.startColor = unit.color;
      }
   }
   else // clients
   {
      // Show particle effect
      shotFX = Instantiate(healFXPrefab, transform.position, Quaternion.identity);
      shotFX.Rotate(270.0,0.0,0.0);
      shotFXParticle = shotFX.GetComponent(ParticleSystem);
      shotFXParticle.startColor = unit.color;
   }
   return showHealFX;
}