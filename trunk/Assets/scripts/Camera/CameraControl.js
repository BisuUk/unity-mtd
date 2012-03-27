#pragma strict

var zoomSpeed : float;
var panSpeed : float;
var edgeScreenScroll : boolean = true;
var panZoomDamping : float;
var orbitSensitivity : float = 1.5;
var orbitOffset: float = 7.5;
private var cameraAimPosition : Vector3;
private var resetPosition : Vector3;
private var resetOrientation : boolean = false;

function Start()
{
}

function LateUpdate ()
{
   var adjustPanSpeed : float = panSpeed * (transform.position.y * panZoomDamping);

   // MMB
   if (Input.GetMouseButton(2))
   {
      // If we were resetting view, user can override
      resetOrientation = false;

      // If shift key held down, orbit camera
      if (Input.GetKey (KeyCode.LeftShift) || Input.GetKey (KeyCode.RightShift))
      {
         cameraAimPosition = transform.position;
         cameraAimPosition += transform.forward * orbitOffset;
         transform.RotateAround(cameraAimPosition, Vector3.up, Input.GetAxis("Mouse X")*150*orbitSensitivity*Time.deltaTime);
         transform.RotateAround(cameraAimPosition, transform.right, Input.GetAxis("Mouse Y")*-100*orbitSensitivity*Time.deltaTime);
         //Debug.Log("x="+transform.localRotation.eulerAngles.x);
      }
      else // pan camera
         transform.Translate(Input.GetAxis("Mouse X")*-adjustPanSpeed, Input.GetAxis("Mouse Y")*-adjustPanSpeed, 0);
   }

   // Mouse wheel (zoom)
   var wheelDelta : float = Input.GetAxis("Mouse ScrollWheel");
   if (wheelDelta != 0.0)
   {
      resetOrientation = false;
      transform.Translate(0, 0, wheelDelta*zoomSpeed);
   }


   if (resetOrientation)
   {
      //transform.localRotation.eulerAngles = Quaternion.Euler(90,0,0).eulerAngles;
      transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.Euler(90,0,0), Time.deltaTime*5.0);
      transform.position = Vector3.Lerp(transform.position, resetPosition, Time.deltaTime*10.0);
      // If we're rotated looking downward, and at 20 unit high, done resetting
      if (transform.rotation == Quaternion.Euler(90,0,0) && Mathf.Approximately(transform.position.y, 20.0))
         resetOrientation = false;
   }


   if (edgeScreenScroll)
   {
      // Edge of screen scrolling
      if (Input.mousePosition.x < 10)
      {
         transform.Translate(-adjustPanSpeed, 0, 0);
         resetOrientation = true;
      }
      else if (Input.mousePosition.x > Screen.width-10)
      {
         transform.Translate(adjustPanSpeed, 0, 0);
         resetOrientation = true;
      }
      
      if (Input.mousePosition.y < 10)
      {
         transform.Translate(0, -adjustPanSpeed, 0);
         resetOrientation = true;
      }
      else if (Input.mousePosition.y > Screen.height-10)
      {
         transform.Translate(0, adjustPanSpeed, 0);
         resetOrientation = true;
      }
   }


   // Camera doesn't go below game board
   if (transform.position.y <= 3)
      transform.position.y = 3;
}

function Update ()
{
   // On backspace, initiate reset camera orientation
   if (Input.GetKeyDown(KeyCode.Backspace))
   {
      resetOrientation = true;
      resetPosition = transform.position;
      resetPosition.y = 20;
   }
}


