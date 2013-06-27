#pragma strict
#pragma downcast

var magnitude : float;
var base : AbilityBase;
var explosionPrefab : Transform;

private var startTime : float;
private static var ID : int = 0;

function Start()
{
   if (Network.isServer || Game.hostType == 0)
   {
      if (ID == 0)
         ID = Utility.GetUniqueID();
   }
   startTime = Time.time;
}

function Update()
{
   if (Network.isServer || Game.hostType == 0)
   {
      // Check if it's time to die
      if (Time.time >= startTime+base.duration)
      {
         if (Game.hostType>0)
            Network.Destroy(gameObject);
         else
            Destroy(gameObject);
      }
   }
   var c : Color = base.color;
   c.a = Mathf.Lerp(base.color.a, 0, ((Time.time-startTime)/base.duration));
   base.SetChildrenColor(transform, c);
}

function OnTriggerEnter(other : Collider)
{
   // A unit stop colliding with us, apply buff
   if (Network.isServer || Game.hostType == 0)
   {
      var unit : Unit = other.gameObject.GetComponent(Unit);
      if (unit && unit.isAttackable)
         unit.ApplyDamage(ID, magnitude, base.color);
   }
}

function MakeCursor(isCursor : boolean)
{
   enabled = !isCursor;
   renderer.enabled = isCursor;
}

function OnSpawnEffect()
{
   var explosion : Transform;
   if (Network.isServer)
      explosion = Network.Instantiate(explosionPrefab, transform.position, Quaternion.identity, 0);
   else
      explosion = Instantiate(explosionPrefab, transform.position, Quaternion.identity);
   SetChildrenColor(explosion.transform, base.color);

   // Wait till color is set, then play.
   // NOTE: If we don't wait, clients sometimes spawn a few uncolored particles.
   explosion.particleSystem.Play();
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t && t.particleSystem)
      t.particleSystem.startColor = newColor;
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}