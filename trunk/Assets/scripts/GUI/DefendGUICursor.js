#pragma strict
#pragma downcast

var legalLocation : boolean = false;
var canAfford : boolean = false;
var tower : Tower;
var mode : int = 0;

function Awake()
{
   tower = gameObject.GetComponent(Tower);
   //Destroy(tower.FOVCollider.gameObject);
   tower.SetColor(Color.white);
   SetMode(0);
}

function SetMode(newMode : int)
{
   mode = newMode;
   if (mode==0)
      tower.SetFOVMesh(tower.fov);
   else
   {
      if (tower.placeWithOrient)
         tower.SetFOVMesh(tower.fov);
      else // Set mode to 2 for 360 FOV tower, GUI will just place tower
         mode = 2;
   }
}

function Update()
{
   if (renderer.enabled)
   {
      // Draw ray from camera mousepoint to ground plane.
      var hit : RaycastHit;
      var mask = (1 << 10) | (1 << 4); // terrain & water

      var cursorColor : Color = Color.gray;

      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         var hitPoint : Vector3 = hit.point;
         hitPoint.y += 0.5;

         // Check the location on the ground where the mouse cursor is
         // see if there's anything obstructing (anything on layer 9)
         var collider : CapsuleCollider = GetComponent(CapsuleCollider);
         var mask2 = (1 << 9); // OBSTRUCT
         legalLocation = (hit.transform.gameObject.layer!=4) && (Physics.CheckSphere(hitPoint, collider.radius*transform.localScale.x, mask2)==false);

         // Draw circle around possible range
         if (mode == 0)
         {
            transform.position = hitPoint;
            transform.position.y += (tower.verticalOffset + tower.verticalOffset*tower.AdjustStrength(tower.tempStrength, true));
         }
         // Draw cone of FOV
         else //if (mode == 1)
         {
            legalLocation = true; // rotating so it's already placed
            hitPoint.y = transform.position.y;
            transform.LookAt(hitPoint);
            tower.FOV.rotation = transform.rotation;
         }

         // Set cursor color based on valid location (gray if invalid)
         cursorColor = (legalLocation && canAfford) ? DefendGUIPanel.selectedColor : Color.gray;
         tower.SetColor(cursorColor);
      }
      else
      {
         legalLocation = false;
      }

      // AOE object follows cursor
      tower.FOV.transform.position = transform.position;
      tower.FOV.transform.rotation = transform.rotation;
   }
}
