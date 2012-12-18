#pragma strict
#pragma downcast

class Monster extends MonoBehaviour
{

var color : Color;
var model : GameObject;
var targetingBehavior : int;
var FOVRenderer : MeshRenderer;

var targets : List.<Unit>;

function Awake()
{
   FOVRenderer.transform.parent = null;
   targets = new List.<Unit>();
}

function Start()
{
   SetColor(color);

   if (model)
   {
      model.animation["idleRW"].layer = 0;
      model.animation["fireRW"].layer = 2;
      model.animation["spawnRW"].layer = 2;


      model.animation.CrossFadeQueued("spawnRW");
      model.animation.CrossFadeQueued("idleRW");
   }
}

function AddTarget(unit : Unit)
{
   targets.Add(unit);
}

function RemoveTarget(unit : Unit)
{
   targets.Remove(unit); // O(n)
}

function FindSingleTarget(checkLOS : boolean) : Unit
{
   var targ : Unit = null;
   var position : Vector3 = transform.position;
   var closestDist : float = Mathf.Infinity;
   var leastHealth : float = Mathf.Infinity;
   var bestColorDiff : float = 0.0;

   // Iterate through them and find best target for behavior.
   // NOTE: Iterates backwards so a remove can safely occur
   // without throwing off iterators.
   for (var i : int = targets.Count-1; i >= 0; --i)
   {
      var unit : Unit = targets[i];
      if (!unit)
      {
         targets.RemoveAt(i); // if target is null, remove from list
      }
      // Check unit is alive and not paused
      else if (unit.isAttackable)
      {
         var diff = (unit.transform.position - position);
         var dist = diff.magnitude;
         var pass : boolean = false;

         if (checkLOS == false)
            pass = true;
         else
         {
            // Check if object is in line of sight
            var mask = (1 << 9); // OBSTRUCT
            if (Physics.Linecast(transform.position, unit.transform.position, mask)==false)
               pass = true;
         }

         if (pass)
         {
            // Target closest
            switch (targetingBehavior)
            {
               // WEAKEST
               case 0:
                  if (unit.health < leastHealth)
                  {
                     leastHealth = unit.health;
                     targ = unit;
                  }
               break;

               // CLOSEST
               case 1:
                  if (dist < closestDist)
                  {
                     closestDist = dist;
                     targ = unit;
                  }
               break;

               // BEST COLOR
               case 2:
                  var unitColor : Color = unit.actualColor;
                  var colorDiff = Utility.ColorMatch(color, unitColor);
                  if (colorDiff > bestColorDiff)
                  {
                     bestColorDiff = colorDiff;
                     targ = unit;
                  }
               break;
            }
         }

      }
   }
   return targ;
}

function SetColor(newColor : Color)
{

   Debug.Log("SetColor: nc="+newColor+" c="+Utility.FindClosestBaseColor(newColor));

   color = newColor;
   SetColor(transform, newColor);
}

private function SetColor(t : Transform, newColor : Color)
{
   var c : Color = newColor;
   if (t.renderer)
   {
      t.renderer.material.SetColor("_TintColor", c);
      t.renderer.material.color = c;
   }
   for (var child : Transform in t)
      SetColor(child, newColor);
}

function OnMouseEnter()
{
   FOVRenderer.enabled = true;
}

function OnMouseExit()
{
   FOVRenderer.enabled = false;
}

}