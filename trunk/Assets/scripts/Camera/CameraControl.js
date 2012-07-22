#pragma strict

var zoomSpeed : float;
var panSpeed : float;
var edgeScreenScroll : boolean = true;
var panZoomDamping : float;
var orbitSensitivity : float = 1.5;
var orbitOffset: float = 7.5;
private var cameraAimPosition : Vector3;
private var resetPosition : Vector3;
private var resetRotation : Quaternion;
private var resetOrientation : boolean = false;
private var resetOrientStartTime : float;
private var resetOrientDuration : float = 1.0;
private var resetOrientLerp : float = 0.0;



function Pan(amount : Vector3)
{
   transform.Translate(amount);
}

function LateUpdate()
{
   var adjustPanSpeed : float = panSpeed * (transform.position.y * panZoomDamping);
   var panAmount : Vector3 = Vector3.zero;


   // MMB & spacebar
   if (Input.GetMouseButton(2) || Input.GetKey ((KeyCode.LeftAlt || KeyCode.RightAlt)))
   {
      // If we were resetting view, user can override
      resetOrientation = false;

      // If shift key held down, orbit camera
      if (Input.GetKey (KeyCode.LeftAlt || KeyCode.RightAlt))
      {
         cameraAimPosition = transform.position;
         cameraAimPosition += transform.forward * orbitOffset;
         transform.RotateAround(cameraAimPosition, Vector3.up, Input.GetAxis("Mouse X")*100*orbitSensitivity*Time.deltaTime);
         transform.RotateAround(cameraAimPosition, transform.right, Input.GetAxis("Mouse Y")*-100*orbitSensitivity*Time.deltaTime);
         //Debug.Log("x="+transform.localRotation.eulerAngles.x);
      }
      else // pan camera
      {
         panAmount = Vector3(Input.GetAxis("Mouse X")*-adjustPanSpeed, Input.GetAxis("Mouse Y")*-adjustPanSpeed, 0);
      }

   }

   // Mouse wheel (zoom)
   var wheelDelta : float = Input.GetAxis("Mouse ScrollWheel");
   if (wheelDelta != 0.0)
   {
      resetOrientation = false;
      transform.Translate(0, 0, wheelDelta*zoomSpeed);
   }

   // Arrow Keys
   if (Input.GetKey (KeyCode.RightArrow))
      panAmount.x = adjustPanSpeed * Time.deltaTime * 10;
   else if (Input.GetKey (KeyCode.LeftArrow))
      panAmount.x = -adjustPanSpeed * Time.deltaTime * 10;

   if (Input.GetKey (KeyCode.UpArrow))
      panAmount.y = adjustPanSpeed * Time.deltaTime * 10;
   else if (Input.GetKey (KeyCode.DownArrow))
      panAmount.y = -adjustPanSpeed * Time.deltaTime * 10;


   if (edgeScreenScroll)
   {
      // Edge of screen scrolling
      if (Input.mousePosition.x < 10)
         panAmount.x = -adjustPanSpeed;
      else if (Input.mousePosition.x > Screen.width-10)
         panAmount.x = adjustPanSpeed;

      if (Input.mousePosition.y < 10)
         panAmount.y = -adjustPanSpeed;
      else if (Input.mousePosition.y > Screen.height-10)
         panAmount.y = adjustPanSpeed;
   }

   if (panAmount != Vector3.zero)
   {
      resetOrientation = false;
      Pan(panAmount);
   }

   if (resetOrientation)
   {
      resetOrientLerp = (Time.time-resetOrientStartTime)/resetOrientDuration;
      transform.rotation = Quaternion.Slerp(transform.rotation, resetRotation, resetOrientLerp);
      transform.position = Vector3.Lerp(transform.position, resetPosition, resetOrientLerp);

      if (transform.rotation == resetRotation && transform.position == resetPosition)
         resetOrientation = false;
   }

   // Camera doesn't go below game board
   if (transform.position.y <= 3)
      transform.position.y = 3;
}

function Update ()
{
   var hit : RaycastHit;
   var hitPoint : Vector3;
   var mask : int;
   var ray : Ray;

   // Initiate reset camera orientation
   if (Input.GetKeyDown(KeyCode.R))
   {
      resetOrientStartTime = Time.time;
      resetOrientation = true;

      resetPosition = transform.position;
      // Draw ray from camera mousepoint to ground plane.
      mask = (1 << 10) | (1 << 4); // terrain & water
      if (Physics.Raycast(transform.position, Vector3.down, hit, Mathf.Infinity, mask))
      {
         hitPoint = hit.point;
         hitPoint.y += 80.0;
         resetPosition = hitPoint;
      }
      resetRotation = Quaternion.Euler(85,0,0);
   }
   else if (Input.GetKeyDown(KeyCode.F))
   {
      // Draw ray from camera mousepoint to ground plane.
      mask = (1 << 10) | (1 << 4); // terrain & water
      ray = Camera.main.ScreenPointToRay(Input.mousePosition);
      if (Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask))
      {
         hitPoint = hit.point;
         hitPoint.y += 80.0;

         resetOrientStartTime = Time.time;
         resetOrientation = true;
         resetPosition = hitPoint;
         // Get flat forward vector
         var p1 : Vector3 = transform.position;
         p1.y = 0.0;
         var p2 : Vector3 = hitPoint;
         p2.y = 0.0;
         // Don't quite go all the way to the desire point,
         // so that when we down angle slightly our target
         // point is somewhat centered on the screen.
         resetPosition += (p2-p1).normalized * -40.0;
         resetRotation = Quaternion.LookRotation(p2-p1)*Quaternion.Euler(65,0,0);
      }

   }
}