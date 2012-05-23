#pragma strict
#pragma downcast

var mode : int = 0;
var color : Color;
var zone : Rect;
var manaCost : float;
var manaCostPerArea : float;

private var firstPoint : Vector3;
private var firstPointPlaced : boolean;
private var percentText : TextMesh;

function Awake()
{
   color = Color.white;
   color.a = 0.33;
   mode = 0;

   percentText = transform.Find("PercentText").GetComponent(TextMesh);
   percentText.transform.parent = null;
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
         percentText.renderer.material.color = (manaCost > Game.player.mana) ? Color.red : Utility.manaTextColor;
      }

      if (firstPointPlaced)
      {
         // 2nd point left of 1st
         if (firstPoint.x >= transform.position.x)
         {
            zone.x = transform.position.x;
             // 2nd point above 1st
            if (firstPoint.z >= transform.position.z)
               zone.y = transform.position.z;
            else // 2nd point below 1st
               zone.y = firstPoint.z;
         }
         else // 2nd point right of 1st
         {
            zone.x = firstPoint.x;
            // 2nd point above 1st
            if (firstPoint.z >= transform.position.z)
               zone.y = transform.position.z;
            else // 2nd point below 1st
               zone.y = firstPoint.z;
         }
         zone.width = Mathf.Abs(transform.position.x - firstPoint.x);
         zone.height = Mathf.Abs(transform.position.z - firstPoint.z);

         // Draw polygon to area scale
         transform.localScale = Vector3(zone.width, 1, zone.height);
         transform.position.x = zone.center.x;
         transform.position.z = zone.center.y;

         // Draw mana cost text inside the polygon
         manaCost = (manaCostPerArea * (zone.width * zone.height));
         percentText.renderer.enabled = true;
         percentText.text = manaCost.ToString("#0")+"%";
         percentText.transform.position = transform.position;
      }
   }
}

function OnDestroy()
{
   Destroy(percentText.gameObject);
}

function SetChildrenColor(t : Transform, newColor : Color)
{
   if (t.renderer && t.renderer.material)
      t.renderer.material.color = newColor;
   for (var child : Transform in t)
      SetChildrenColor(child, newColor);
}
