#pragma strict
#pragma downcast

var maxStunDuration : float;
var base : AbilityBase;

private var ID : int;
private var startTime : float;

function Start()
{
   if (Network.isServer || Game.hostType == 0)
   {
      ID = Utility.GetUniqueID();
      startTime = Time.time;
   }
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
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t.renderer && t.renderer.material)
      t.renderer.material.color = newColor;
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}

function OnTriggerEnter(other : Collider)
{
   if (Network.isServer || Game.hostType == 0)
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
}