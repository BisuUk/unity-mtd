#pragma strict

//var squad : UnitSquad;
private var origScale : Vector3;
/*
private var text3d : Transform;
private static var text3dPrefab : Transform;
var textOffsetX : float = 0.5;
var textOffsetY : float = -0.5;
*/

function Start()
{
   origScale = transform.localScale;

/*
   if (text3dPrefab==null)
      text3dPrefab = Resources.Load("prefabs/fx/Text3DPrefab", Transform);
   text3d = Instantiate(text3dPrefab, Vector3.zero, Quaternion.identity);
   text3d.GetComponent(BillboardFX).enabled = false;
   text3d.gameObject.layer = 8; // 3D GUI
*/
}


function Update()
{
/*
   if (squad)
   {
      // Spin the item
   	transform.Rotate(50.0*Time.deltaTime, 50.0*Time.deltaTime, 0.0);
   	transform.localScale = origScale*(1+squad.size);
	   renderer.material.color = squad.color;

      // Draw squad count index next to cursor
      if (squad.count > 1)
      {
         textOffsetX=squad.size+0.1;
         textOffsetY=-squad.size-0.1;
         text3d.renderer.enabled = true;
         text3d.renderer.material.color = squad.color;
         text3d.transform.position = transform.position;
         text3d.transform.position = transform.position + (GUIControl.previewCamera.transform.up*textOffsetY) + (GUIControl.previewCamera.transform.right*textOffsetX);
         text3d.GetComponent(TextMesh).text = "x"+squad.count.ToString();
      }
      else // Selected squad has < 2 units
      {
         text3d.renderer.enabled = false;
      }

   }
*/
}

/*
function OnDestroy()
{
   if (text3d)
      Destroy(text3d.gameObject);
}
*/