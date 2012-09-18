#pragma strict
#pragma downcast

var unit : Unit;
var radiusLimits : Vector2;
var stunDurationLimits : Vector2;
var stunFXPrefab : Transform;
var AOE : Transform;
var netView : NetworkView;

private var radius : float;


function Update()
{
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

function OnDeath()
{
   Fire();
   if (Game.hostType>0)
      netView.RPC("Fire", RPCMode.Others);
}

@RPC
function Fire()
{
   // Set next time to fire
   //var showHealFX : boolean = false;
   //var shotFX : Transform;
   //var shotFXParticle : ParticleSystem;

   if (Network.isServer || Game.hostType==0)
   {
      var mask = (1 << 9); // OBSTRUCT
      var colliders : Collider[] = Physics.OverlapSphere(transform.position, radius, mask);
      for (var hit : Collider in colliders)
      {
         if (hit)
         {
            var tower : Tower = hit.GetComponent(Tower);
            if (tower)
            {
               var actualDuration : float = Utility.ColorMatch(tower.color, unit.actualColor) * Mathf.Lerp(stunDurationLimits.x, stunDurationLimits.y, unit.strength);
               tower.SetConstructing(actualDuration);
               if (Game.hostType > 0)
                  tower.netView.RPC("SetConstructing", RPCMode.Others, actualDuration);
            }

         }
      }
   }
}

function SetDefaultBehaviorEnabled(setValue : boolean)
{
   enabled = setValue;
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
   // Set AOE scale, need here because parent scaling changes dynamically
   var AOEScale : float = radius*2.0/transform.localScale.x; // divide by parent scale
   AOE.localScale=Vector3(AOEScale, AOEScale, AOEScale);
}

function OnSetSelected(selected : boolean)
{
   AOE.renderer.enabled = selected;
}

function OnMouseEnter()
{
   AOE.renderer.enabled = true;
}

function OnMouseExit()
{
   if (!unit.isSelected)
      AOE.renderer.enabled = false;
}

function OnAbility1()
{
   if (unit)
   {
      if (!Network.isClient)
         unit.Kill();
   }
}