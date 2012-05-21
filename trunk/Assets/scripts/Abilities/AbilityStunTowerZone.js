#pragma strict
#pragma downcast

var color : Color;
var zone : Rect;
var maxStunDuration : float;
var isBuff : boolean;
var duration : float;

private var ID : int;
private var startTime : float;
private var alpha : float;


function Start()
{
   ID = Utility.GetUniqueID();

   color.a = 0.33;
   SetChildrenColor(transform, color);

   startTime = Time.time;

   if (Network.isServer || Game.hostType == 0)
   {
      // Find all game objects with tag
      var objs : GameObject[] = GameObject.FindGameObjectsWithTag("TOWER");

      // Iterate through them and find the closest one
      for (var obj : GameObject in objs)
      {
         if (renderer.bounds.Contains(obj.transform.position))
         {
            var tower : Tower = obj.GetComponent(Tower);
            var actualDuration : float = Utility.ColorMatch(tower.color, color) * maxStunDuration;
            tower.SetConstructing(actualDuration);
            if (Game.hostType > 0)
               tower.netView.RPC("SetConstructing", RPCMode.Others, actualDuration);
         }
      }
   }
}

function Update()
{
   if (Network.isServer || Game.hostType == 0)
   {
      if (Time.time >= startTime+duration)
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
