#pragma strict
#pragma downcast

var unit : Unit;
var fireRate : float;
var radiusLimits : Vector2;
var healFXPrefab : Transform;
var AOE : Transform;
var netView : NetworkView;

private var targs : List.<GameObject>;
private var nextFireTime : float;
private var radius : float;

function Awake()
{
   nextFireTime = 0.0;
   targs = new List.<GameObject>();
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

private function SetChildrenTextureOffset(t : Transform, newOffset : Vector2)
{
   //if (t != infoPlane && t != AOE)
      t.renderer.material.SetTextureOffset("_MainTex", newOffset);
   for (var child : Transform in t)
      SetChildrenTextureOffset(child, newOffset);
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


function AttributesChanged()
{
   // Calc radius based on unit strength
   radius = Mathf.Lerp(radiusLimits.x, radiusLimits.y, unit.strength);

   // Animate model texture for that weird effect...
   //var texOffset : Vector2 = Vector2(Time.time * 0.3, Time.time * 0.3);
   //SetChildrenTextureOffset(AOE.transform, texOffset);
   var c : Color = unit.color;
   c.a = 0.1;
   AOE.renderer.material.SetColor("_TintColor", c);
   // Set AOE scale
   var AOEScale : float = radius*2.0/transform.localScale.x; // divide by parent scale
   AOE.localScale=Vector3(AOEScale, AOEScale, AOEScale);
}

function OnMouseEnter()
{
   AOE.renderer.enabled = true;
}

function OnMouseExit()
{
   AOE.renderer.enabled = false;
}