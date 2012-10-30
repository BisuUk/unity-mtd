#pragma strict
#pragma downcast

var magnitude : float;
var buffDuration : float;
var base : AbilityBase;
var FXPrefab : Transform;


private var targets : List.<Unit>;
private static var ID : int = 0;

function Awake()
{
   targets = new List.<Unit>();
}

function Start()
{
   if (!Network.isClient)
   {
      if (ID == 0)
         ID = Utility.GetUniqueID();
      Invoke("Die", base.duration);
   }
}

function Die()
{
   for (var u : Unit in targets)
   {
      var effect : Effect = new Effect();
      effect.type = Effect.Types.EFFECT_SPEED;
      effect.val = magnitude;
      if (base.requiresColor)
         effect.color = base.color;
      else
         effect.color = u.actualColor;

      effect.interval = 0.0;
      effect.expireTime = Time.time+buffDuration;
      if (magnitude < 1.0)
         u.ApplyDebuff(ID, effect, true);
      else
         u.ApplyBuff(ID, effect, true);
   }

   targets.Clear();

   if (Network.isServer)
      Network.Destroy(gameObject);
   else
      Destroy(gameObject);
}

function OnTriggerEnter(other : Collider)
{
   var unit : Unit = other.gameObject.GetComponent(Unit);
   if (unit)
      targets.Add(unit);
}


function OnTriggerExit(other : Collider)
{
   var unit : Unit = other.gameObject.GetComponent(Unit);
   if (unit)
      targets.Remove(unit);
}


function MakeCursor(isCursor : boolean)
{
   enabled = !isCursor;
   renderer.enabled = isCursor;
}

function OnSpawnEffect()
{
   var fx : Transform;
   if (Network.isServer)
      fx = Network.Instantiate(FXPrefab, transform.position, Quaternion.identity, 0);
   else
      fx = Instantiate(FXPrefab, transform.position, Quaternion.identity);
   SetChildrenColor(fx.transform, base.color);
   // Wait till color is set, then play.
   // NOTE: If we don't wait, clients sometimes spawn a few uncolored particles.
   fx.particleSystem.Play();
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t && t.particleSystem)
      t.particleSystem.startColor = newColor;
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}