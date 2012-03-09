#pragma strict

var zoomSpeed : float;
var panSpeed : float;
var edgeScreenScroll : boolean = false;
var panZoomDamping : float;


function Start()
{
}

function Update ()
{
   var adjustPanSpeed : float = panSpeed * (transform.position.y * panZoomDamping);

   // Mouse click right (pan)
   if (Input.GetMouseButton(1))
      transform.Translate(Input.GetAxis("Mouse X")*-adjustPanSpeed, 0, Input.GetAxis("Mouse Y")*-adjustPanSpeed, Space.World);

   if (edgeScreenScroll)
   {
      // Edge of screen scrolling
      if (Input.mousePosition.x < 10)
         transform.Translate(-adjustPanSpeed, 0, 0, Space.World);
      else if (Input.mousePosition.x > Screen.width-10)
         transform.Translate(adjustPanSpeed, 0, 0, Space.World);
      
      if (Input.mousePosition.y < 10)
         transform.Translate(0, 0, -adjustPanSpeed, Space.World);
      else if (Input.mousePosition.y > Screen.height-10)
         transform.Translate(0, 0, adjustPanSpeed, Space.World);
   }

   // Mouse wheel (zoom)
   transform.Translate(0, 0, Input.GetAxis("Mouse ScrollWheel")*zoomSpeed);

   // Camera doesn't go below game board
   if (transform.position.y <= 3)
      transform.position.y = 3;
}


/*
function Start ()
{
 // Make the rigid body not change rotation
 if (rigidbody)
    rigidbody.freezeRotation = true;
}


public enum RotationAxes { MouseXAndY = 0, MouseX = 1, MouseY = 2 }
public RotationAxes axes = RotationAxes.MouseXAndY;
public float sensitivityX = 15F;
public float sensitivityY = 15F;

public float minimumX = -360F;
public float maximumX = 360F;

public float minimumY = -60F;
public float maximumY = 60F;

float rotationY = 0F;
 if (Input.GetMouseButton(1))
 {
    if (axes == RotationAxes.MouseXAndY)
    {
       float rotationX = transform.localEulerAngles.y + Input.GetAxis("Mouse X") * sensitivityX;

       rotationY += Input.GetAxis("Mouse Y") * sensitivityY;
       rotationY = Mathf.Clamp (rotationY, minimumY, maximumY);

       transform.localEulerAngles = new Vector3(-rotationY, rotationX, 0);
    }
    else if (axes == RotationAxes.MouseX)
    {
       transform.Rotate(0, Input.GetAxis("Mouse X") * sensitivityX, 0);
    }
    else
    {
       rotationY += Input.GetAxis("Mouse Y") * sensitivityY;
       rotationY = Mathf.Clamp (rotationY, minimumY, maximumY);

       transform.localEulerAngles = new Vector3(-rotationY, transform.localEulerAngles.y, 0);
    }
 }
*/