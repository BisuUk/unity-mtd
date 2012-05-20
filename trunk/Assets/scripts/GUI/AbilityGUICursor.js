#pragma strict
#pragma downcast

var mode : int = 0;
var color : Color;


private var firstFramer : GameObject = null;
private var box : GameObject = null;
private var zone : Rect;

function Awake()
{
   color = Color.white;
   mode = 0;

}

function SetMode(newMode : int)
{
   mode = newMode;
      Debug.Log("SetMode="+newMode);
   switch (newMode)
   {
   case 0:
      if (firstFramer != null)
      {
         Destroy(firstFramer);
         Destroy(box);
      }
      break;
   case 1:
      firstFramer = Instantiate(gameObject, transform.position, Quaternion.identity);
      firstFramer.GetComponent(AbilityGUICursor).enabled = false;
      //box = Instantiate(PrimitiveType.Cube, transform.position, Quaternion.identity);

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
         SetChildrenColor(transform, color);
      }

      if (firstFramer)
      {
         // Left side
         if (firstFramer.transform.position.x >= transform.position.x)
         {
            zone.x = transform.position.x;
            zone.width = (firstFramer.transform.position.x - transform.position.x);
            // Lower left
            if (firstFramer.transform.position.z >= transform.position.z)
            {
               zone.y = transform.position.z;
               zone.height = (firstFramer.transform.position.z - transform.position.z);
            }
            else // upper left
            {
               zone.y = firstFramer.transform.position.z;
               zone.height = (transform.position.z - firstFramer.transform.position.z);
            }
         }





      }

      if (box)
      {

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

function OnDestroy()
{
   if (firstFramer != null)
      Destroy(firstFramer);
   if (box != null)
      Destroy(box);
}