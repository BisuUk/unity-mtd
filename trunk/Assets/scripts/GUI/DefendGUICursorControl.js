#pragma strict
#pragma downcast

var legalLocation : boolean = false;
var tower : Tower;
var mode : int = 0;

function Awake()
{
   tower = gameObject.GetComponent(Tower);
}

function Update()
{
   if (renderer.enabled)
   {
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = (1 << 9);// | (1 << 10);

      var cursorColor : Color = Color.gray;

      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         // Check the location on the ground where the mouse cursor is
         // see if there's anything obstructing (anything on layer 10)
         var collider : SphereCollider = GetComponent(SphereCollider);
         var mask2 = (1 << 10); // BLOCKS
         legalLocation = (Physics.CheckSphere(hit.point, collider.radius*transform.localScale.x, mask2)==false);

         // Draw circle around possible range
         if (mode == 0)
         {
            transform.position = hit.point;
            tower.SetAOEMesh(360);
         }
         // Draw cone of FOV
         else //if (mode == 1)
         {
            legalLocation = true; // rotating so it's already placed
            transform.LookAt(hit.point);
            tower.SetAOEMesh(tower.baseFOV);
         }

         // Set cursor color based on valid location (gray if invalid)
         cursorColor = (legalLocation) ? DefendGUI.selectedColor : Color.gray;
         //lineRenderer.SetColors(cursorColor, cursorColor);
      }
      else
      {
         legalLocation = false;
      }

      tower.AOE.transform.position = transform.position;
      tower.AOE.transform.rotation = transform.rotation;
   }
}
