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

      // Find all game objects with tag
      var objs : GameObject[] = GameObject.FindGameObjectsWithTag("TOWER");

      // Iterate through them and find the closest one
      for (var obj : GameObject in objs)
      {
         if (renderer.bounds.Contains(obj.transform.position))
         {
            var tower : Tower = obj.GetComponent(Tower);
            var actualDuration : float = Utility.ColorMatch(tower.color, base.color) * maxStunDuration;
            tower.SetConstructing(actualDuration);
            if (Game.hostType > 0)
               tower.netView.RPC("SetConstructing", RPCMode.Others, actualDuration);
         }
      }
   }
}

function Update()
{
   renderer.enabled = true;
   if (Network.isServer || Game.hostType == 0)
   {
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

function MakeCursor(isCursor : boolean)
{
   enabled = !isCursor;
}