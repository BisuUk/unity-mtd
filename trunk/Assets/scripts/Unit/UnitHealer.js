#pragma strict
#pragma downcast

var unit : Unit;
var fireRateLimits : Vector2;
var radiusLimits : Vector2;
var healingLimits : Vector2;
var healFXPrefab : Transform;
var AOE : Transform;
var netView : NetworkView;

private var targs : List.<GameObject>;
private var nextFireTime : float;
private var radius : float;
private var fireRate : float;
private var healingPercent : float;

function Awake()
{
   nextFireTime = 0.0;
   targs = new List.<GameObject>();
   AOE.renderer.enabled = false;
}

function Update()
{
   // Server manages targeting behavior
   if (Network.isServer || Game.hostType==0)
   {
      //  Fire if it's time
      if(Time.time >= nextFireTime)
      {
         unit.FindTargets(targs, radius, false);
         if (targs.Count>0)
         {
            var healedSomething : boolean = Fire();
            if (Game.hostType>0 && healedSomething)
               netView.RPC("Fire", RPCMode.Others);
         }
      }
   }
   // Set AOE scale, need here because parent scaling changes dynamically
   if (transform.localScale.x > 0) // (not sure why this comes up as 0 sometimes)
   {
      var AOEScale : float = radius*2.0/transform.localScale.x; // divide by parent scale
      AOE.localScale=Vector3(AOEScale, AOEScale, AOEScale);

      AOE.renderer.material.color = unit.actualColor;
      AOE.renderer.material.color.a = 0.2;
   }
}

private function SetChildrenTextureOffset(t : Transform, newOffset : Vector2)
{
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

   if (Network.isServer || Game.hostType==0)
   {
      for (var targ : GameObject in targs)
      {
         var targUnit : Unit = targ.GetComponent(Unit);
         var healthBoost : int = Mathf.Lerp(healingLimits.x, healingLimits.y, unit.strength) * targUnit.maxHealth;
         if (targUnit.ApplyHealing(unit.ID, healthBoost, unit.color))
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

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
}

function AttributesChanged()
{
   // Calc radius based on unit strength
   radius = Mathf.Lerp(radiusLimits.x, radiusLimits.y, unit.strength);
   healingPercent = Mathf.Lerp(healingLimits.x, healingLimits.y, unit.strength);
   fireRate = Mathf.Lerp(fireRateLimits.x, fireRateLimits.y, unit.strength);

   // Animate model texture for that weird effect...
   //var texOffset : Vector2 = Vector2(Time.time * 0.3, Time.time * 0.3);
   //SetChildrenTextureOffset(AOE.transform, texOffset);
   var c : Color = unit.color;
   c.a = 0.1;
   AOE.renderer.material.SetColor("_TintColor", c);
   // Set AOE scale, need here because parent scaling changes dynamically
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