using UnityEngine;
using System.Collections;

public class RobotBehave : MonoBehaviour {

    public Transform[] i_wayPoints;//Path
    public Transform i_leftFoot;
    public Transform i_rightFoot;
    public DecalType i_decalTypeLeft;
    public DecalType i_decalTypeRight;
    public int _health = 100;
    public GameObject i_ragdoll;

    private Transform _nextWP;
    private int _indexNextWP=1;
    private bool _right = true;

 

	// Use this for initialization
	void Start () {
	    SetInitialState();
	}
	
	// Update is called once per frame
	void Update () {
        //Move
	    gameObject.transform.LookAt(_nextWP);
        gameObject.transform.Translate(Vector3.forward*Time.deltaTime,Space.Self);

        if ((gameObject.transform.position - _nextWP.position).magnitude < 0.2F)
        {
            if (_indexNextWP == 3)
                SetInitialState();
            else
            {
                _indexNextWP++;
                _nextWP = i_wayPoints[_indexNextWP];
            }
        }
        //FootSteps Control
        if (animation["walk"].normalizedTime % 1 > 0.25F && animation["walk"].normalizedTime % 1 < 0.75F && _right)
            RightFootStep();
        if (animation["walk"].normalizedTime % 1 > 0.75F && !_right)
            LeftFootStep();
	}
    private void SetInitialState()
    {
        _indexNextWP = 1;
        gameObject.transform.position = i_wayPoints[0].position;
        _nextWP = i_wayPoints[1];
    }
    private void LeftFootStep()
    {
        RaycastHit hit;
        Ray ray = new Ray(i_leftFoot.position, -i_rightFoot.up);
        bool wasHit = Physics.Raycast(ray, out hit);
        if (wasHit)
        {
            Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalTypeLeft, hit.point, -hit.normal, hit.collider.gameObject, i_leftFoot.forward);
            DecalCreator.CreateDynamicDecal(decalMesh, hit.collider.gameObject, i_decalTypeLeft, null);
        }
        _right = true;
    }
    private void RightFootStep()
    {
        RaycastHit hit;
        Ray ray = new Ray(i_rightFoot.position, -i_rightFoot.up);
        bool wasHit = Physics.Raycast(ray, out hit);
        if (wasHit)
        {
            Mesh decalMesh = DecalCreator.CreateDecalMesh(i_decalTypeRight, hit.point, -hit.normal, hit.collider.gameObject, i_rightFoot.forward);
            DecalCreator.CreateDynamicDecal(decalMesh, hit.collider.gameObject, i_decalTypeRight, null);
        }
        _right = false;
    }
    private void ApplyDamage()
    {
        _health -= 5;
        if(_health<=0)
            Dead();  
    }
    private void Dead()
    {
        GameObject g= Instantiate(i_ragdoll, transform.position, transform.rotation) as GameObject;
        Rigidbody[] r = g.GetComponentsInChildren<Rigidbody>();

        //Before Destroy we need to copy blood splatters to ragdoll
        GameObject[] expeditors = GetComponentInChildren<DecalHolder>().GetAllExpeditors();
        SkinnedMeshRenderer newSkinnedRenderer = g.GetComponentInChildren<SkinnedMeshRenderer>();
        foreach (GameObject expeditor in expeditors)
        {
            //Parent blood skinned mesh renderer to new Skinned mesh renderer object
            expeditor.transform.parent = newSkinnedRenderer.transform;
            expeditor.transform.localPosition = Vector3.zero;
            expeditor.transform.localRotation = Quaternion.identity;
            //Apply new Bones
            expeditor.GetComponent<SkinnedMeshRenderer>().bones = newSkinnedRenderer.bones;
        }

        foreach (Rigidbody rigBody in r)
        {
            rigBody.AddExplosionForce(1000, rigBody.transform.position, 10);
        }

        Destroy(this.gameObject);
    }
}
