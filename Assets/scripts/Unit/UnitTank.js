#pragma strict
#pragma downcast

var unit : Unit;
var fireRate : float;
var radiusLimits : Vector2;
var shotFXPrefab : Transform;
var AOE : Transform;
var netView : NetworkView;

private var targs : List.<GameObject>;
private var nextFireTime : float;
private var radius : float;

function Awake()
{
   nextFireTime = 0.0;
   targs = new List.<GameObject>();
   AOE.renderer.enabled = true;
}

function Update()
{
   // Server manages targeting behavior
   if (Network.isServer || Game.hostType==0)
   {
      //  Fire if it's time
      if(Time.time >= nextFireTime)
      {
         Fire();
      }
   }
   // Set AOE scale, need here because parent scaling changes dynamically
   var AOEScale : float = radius*2.0/transform.localScale.x; // divide by parent scale
   AOE.localScale=Vector3(AOEScale, AOEScale, AOEScale);
   AOE.renderer.material.color = unit.actualColor;
   AOE.renderer.material.color.a = 0.2;

}

function Fire()
{
   // Set next time to fire
   nextFireTime = Time.time + fireRate;

   if (Network.isServer || Game.hostType==0)
   {
      // Find all game objects with UNIT tag
      var objs : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");

      // Iterate through all units
      for (var obj : GameObject in objs)
      {
         var unitScr : Unit = obj.GetComponent(Unit);
         if (obj != gameObject && unitScr.health > 0 && unitScr.unpauseTime == 0.0)
         {
            var diff = (obj.transform.position - transform.position);
            var dist = diff.magnitude;

            // Check object is in range...
            if (dist <= radius)
            {
               // Apply shield effect
               var e : Effect = new Effect();
               e.type = Effect.Types.EFFECT_SHIELD;
               e.val = Mathf.Lerp(0.1, 1.0, unit.strength); // unit.stength
               e.color = unit.color;
               e.interval = 0.0;   // applied every frame
               e.expireTime = 0.0; // no expire
               unitScr.ApplyBuff(unit.ID, e);
            }
            else  // out of range
            {
               // Remove shield effect
               unitScr.RemoveBuff(unit.ID, Effect.Types.EFFECT_SHIELD);
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
   c.a = 0.20;
   //AOE.renderer.material.SetColor("_TintColor", c);
   AOE.renderer.material.color = c;
   // Set AOE scale, need here because parent scaling changes dynamically
   var AOEScale : float = radius*2.0/transform.localScale.x; // divide by parent scale
   AOE.localScale=Vector3(AOEScale, AOEScale, AOEScale);
}

function OnDeath()
{
   // OnDeath tell units to remove buff that was given to them
   if (Network.isServer || Game.hostType==0)
   {
      // Find all game objects with UNIT tag
      var objs : GameObject[] = GameObject.FindGameObjectsWithTag("UNIT");

      // Iterate through all units
      for (var obj : GameObject in objs)
      {
         var unitScr : Unit = obj.GetComponent(Unit);
         if (obj != gameObject && unitScr.health > 0 && unitScr.unpauseTime == 0.0)
         {
            // Remove my shield effect
            unitScr.RemoveBuff(unit.ID, Effect.Types.EFFECT_SHIELD);
         }
      }
   }
}

function OnMouseEnter()
{
   //AOE.renderer.enabled = true;
}

function OnMouseExit()
{
   //AOE.renderer.enabled = false;
}