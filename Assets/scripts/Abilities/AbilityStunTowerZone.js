#pragma strict
#pragma downcast

var maxStunDuration : float;
var base : AbilityBase;
var FXPrefab : Transform;

private var startTime : float;
private static var ID : int = 0;

function Start()
{
   if (!Network.isClient)
   {
      if (ID == 0)
         ID = Utility.GetUniqueID();
   }
   startTime = Time.time;
}

function Update()
{
   if (!Network.isClient)
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
}

function OnTriggerEnter(other : Collider)
{
   if (!Network.isClient)
   {
      var tower : Tower = other.gameObject.GetComponent(Tower);
      if (tower)
      {
         var actualDuration : float = Utility.ColorMatch(tower.color, base.color) * maxStunDuration;
         tower.SetConstructing(actualDuration);
         if (Game.hostType > 0)
            tower.netView.RPC("SetConstructing", RPCMode.Others, actualDuration);
      }
   }
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