#pragma strict
#pragma downcast

var mode : int = 0;
var color : Color;
var zone : Rect;
var manaCost : float;
var manaCostPerArea : float;

private var firstPoint : Vector3;
private var firstPointPlaced : boolean;

function Awake()
{
   color = Color.white;
   color.a = 0.33;
   mode = 0;
}

function SetMode(newMode : int)
{
   mode = newMode;

   switch (newMode)
   {
   case 0:
      renderer.enabled = false;
      firstPointPlaced = false;
      break;
   case 1:
      renderer.enabled = true;
      firstPointPlaced = true;
      firstPoint = transform.position;
      break;
   }
}

function Update()
{
   if (enabled)
   {
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = (1 << 2); // We want to try and hit the IGNORE RAYCAST layer (ironic, I know)

      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         transform.position = hit.point;
         // Set cursor color based on valid location (gray if invalid)
         color.a = 0.33;
         SetChildrenColor(transform, color);
      }

      if (mode == 1)
      {
         // Left side
         if (firstPoint.x >= transform.position.x)
         {
            zone.x = transform.position.x;
            // Lower left
            if (firstPoint.z >= transform.position.z)
               zone.y = transform.position.z;
            else // upper left
               zone.y = firstPoint.z;
         }
         else // right side
         {
            zone.x = firstPoint.x;
            // Lower left
            if (firstPoint.z >= transform.position.z)
               zone.y = transform.position.z;
            else // upper left
               zone.y = firstPoint.z;
         }
         zone.width = Mathf.Abs(transform.position.x - firstPoint.x);
         zone.height = Mathf.Abs(transform.position.z - firstPoint.z);
      }

      if (firstPointPlaced)
      {
         transform.localScale = Vector3(zone.width, 1, zone.height);
         transform.position.x = zone.center.x;
         transform.position.z = zone.center.y;
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
